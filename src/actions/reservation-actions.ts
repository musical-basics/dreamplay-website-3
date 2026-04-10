'use server'

/**
 * reservation-actions.ts
 * Server-side actions for buyer portal: decision persistence + buyer routing.
 * All reads/writes use the service role key (server-side only).
 */

import { createClient } from '@supabase/supabase-js'

// Service-role client — server-side only
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ReservationDecision = 'refund_requested' | 'keep_reservation' | 'upgrade_to_pro'

// ─── Buyer Allowlist ───

/**
 * Returns true if the given email is in the buyer_emails allowlist.
 * Comparison is case-insensitive.
 */
export async function isBuyer(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim()
    console.log('[isBuyer] checking email:', normalizedEmail)
    console.log('[isBuyer] SUPABASE_URL set:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[isBuyer] SERVICE_ROLE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    try {
        const { data, error, status, statusText } = await supabase
            .from('buyer_emails')
            .select('email')
            .eq('email', normalizedEmail)
            .maybeSingle()

        console.log('[isBuyer] query status:', status, statusText)
        console.log('[isBuyer] data:', data)
        console.log('[isBuyer] error:', error)

        if (error) {
            console.error('[isBuyer] ERROR - code:', error.code, 'message:', error.message, 'details:', error.details, 'hint:', error.hint)
            // If we can't reach the DB, fail open — show the page rather than bouncing the buyer
            return false
        }

        const result = !!data
        console.log('[isBuyer] result:', result)
        return result
    } catch (err: any) {
        console.error('[isBuyer] UNEXPECTED ERROR:', err?.message, err)
        return false
    }
}


// ─── Decision Records ───

export interface DecisionRecord {
    id: string
    user_id: string
    email: string | null
    decision: ReservationDecision
    selected_at: string
    order_metadata: Record<string, any>
    created_at: string
    updated_at: string
}

/**
 * Fetch the current saved decision for a user.
 * Returns null if no decision has been recorded yet.
 */
export async function getReservationDecision(userId: string): Promise<DecisionRecord | null> {
    try {
        const { data, error } = await supabase
            .from('reservation_decisions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('[reservation-actions] getReservationDecision error:', error)
            return null
        }

        return data as DecisionRecord | null
    } catch (err) {
        console.error('[reservation-actions] getReservationDecision unexpected error:', err)
        return null
    }
}

/**
 * Upsert a reservation decision for a user.
 * If a decision already exists, it is updated.
 * Returns { success: true } on success or { success: false, error: string } on failure.
 */
export async function saveReservationDecision(
    userId: string,
    email: string | null,
    decision: ReservationDecision,
    orderMetadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if a row already exists for this user
        const { data: existing } = await supabase
            .from('reservation_decisions')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()

        const now = new Date().toISOString()

        if (existing?.id) {
            // Update existing row
            const { error } = await supabase
                .from('reservation_decisions')
                .update({
                    decision,
                    email,
                    selected_at: now,
                    order_metadata: orderMetadata ?? {},
                    updated_at: now,
                })
                .eq('id', existing.id)

            if (error) {
                console.error('[reservation-actions] saveReservationDecision update error:', error)
                return { success: false, error: error.message }
            }
        } else {
            // Insert new row
            const { error } = await supabase
                .from('reservation_decisions')
                .insert({
                    user_id: userId,
                    email,
                    decision,
                    selected_at: now,
                    order_metadata: orderMetadata ?? {},
                    created_at: now,
                    updated_at: now,
                })

            if (error) {
                console.error('[reservation-actions] saveReservationDecision insert error:', error)
                return { success: false, error: error.message }
            }
        }

        return { success: true }
    } catch (err: any) {
        console.error('[reservation-actions] saveReservationDecision unexpected error:', err)
        return { success: false, error: err?.message ?? 'Unknown error' }
    }
}
