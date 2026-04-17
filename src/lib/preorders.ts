/**
 * preorders.ts
 * Internal preorder order layer — types, parsing, and DB lookup for V1.
 *
 * Pure parsing functions (derivePaymentType, parseProductMeta, paymentTypePriority)
 * are separated from DB queries so they can be imported both in server actions
 * and in standalone scripts (import, verify) without pulling in Next.js context.
 *
 * Primary preorder selection rules (deterministic):
 *   1. full_payment or deposit_50 > waitlist_reservation
 *   2. Within the same tier, prefer the newest created_at date.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * V1 internal payment type values.
 * NOTE: 'half_reservation' is the CSV import label but is NOT used internally.
 *       The operative value is always derived from lineitem_name.
 */
export type PaymentType = 'full_payment' | 'deposit_50' | 'waitlist_reservation'

export type ProductLine = 'pro' | 'bundle' | 'keyboard_only' | 'one' | 'unknown'

export interface PreorderOrder {
    id: string
    order_name: string
    raw_shopify_id: string | null
    import_batch_id: string
    source: string
    email: string
    customer_name: string | null
    /** ISO timestamp string */
    created_at: string
    financial_status: string | null
    fulfillment_status: string | null
    total_paid_usd: number | null
    payment_type: PaymentType
    is_reservation: boolean
    lineitem_name: string | null
    product_line: ProductLine
    size_variant: string | null
    finish: string | null
    inserted_at: string
    updated_at: string
}

// ── Payment type derivation ────────────────────────────────────────────────
//
// Source of truth: lineitem_name from Shopify (NOT the CSV payment_type column).
// The CSV uses 'half_reservation'; the V1 internal canonical value is 'deposit_50'.

export function derivePaymentType(lineitemName: string): PaymentType {
    const lower = lineitemName.toLowerCase()
    if (lower.includes('waitlist')) return 'waitlist_reservation'
    if (lower.includes('50% reservation') || lower.includes('50% deposit')) return 'deposit_50'
    return 'full_payment'
}

// ── Product metadata parsing ───────────────────────────────────────────────

export interface ProductMeta {
    product_line: ProductLine
    size_variant: string | null
    finish: string | null
}

export function parseProductMeta(lineitemName: string): ProductMeta {
    // Product line — order matters: check Pro before generic One
    let product_line: ProductLine = 'unknown'
    if (/pro keyboard|one pro/i.test(lineitemName)) {
        product_line = 'pro'
    } else if (/piano bundle/i.test(lineitemName)) {
        product_line = 'bundle'
    } else if (/keyboard only/i.test(lineitemName)) {
        product_line = 'keyboard_only'
    } else if (/one keyboard|dreamplay one/i.test(lineitemName)) {
        product_line = 'one'
    }

    // Size variant
    const sizeMatch = lineitemName.match(/DS(5\.5|6\.0)/i)
    const size_variant = sizeMatch ? `DS${sizeMatch[1]}` : null

    // Finish — specific black variants must be tested before plain Black
    let finish: string | null = null
    if (/nightmare black/i.test(lineitemName)) finish = 'Nightmare Black'
    else if (/midnight black/i.test(lineitemName)) finish = 'Midnight Black'
    else if (/aztec gold/i.test(lineitemName)) finish = 'Aztec Gold'
    else if (/\bblack\b/i.test(lineitemName)) finish = 'Black'
    else if (/\bwhite\b/i.test(lineitemName)) finish = 'White'

    return { product_line, size_variant, finish }
}

// ── Primary preorder priority ──────────────────────────────────────────────
// Lower = higher priority.

export function paymentTypePriority(pt: PaymentType): number {
    if (pt === 'full_payment' || pt === 'deposit_50') return 0
    return 1 // waitlist_reservation
}

// ── Primary preorder lookup ────────────────────────────────────────────────

/**
 * Returns the single "primary" preorder for a buyer email.
 * When multiple orders share the same normalized email, selection is deterministic:
 *   1. full_payment or deposit_50 wins over waitlist_reservation
 *   2. Tie-break: newest created_at
 *
 * Requires a Supabase client with read access to preorder_orders.
 * Use the service-role client from reservation-actions for server-side calls.
 */
export async function getPreorderByEmail(
    email: string,
    supabase: SupabaseClient
): Promise<PreorderOrder | null> {
    const normalizedEmail = email.toLowerCase().trim()

    try {
        const { data, error } = await supabase
            .from('preorder_orders')
            .select('*')
            .eq('email', normalizedEmail)

        if (error) {
            console.error('[getPreorderByEmail] DB error:', error.message)
            return null
        }
        if (!data || data.length === 0) return null

        const orders = data as PreorderOrder[]

        // Sort: lower rank (paid/deposit) first, then newest created_at
        orders.sort((a, b) => {
            const rankDiff = paymentTypePriority(a.payment_type) - paymentTypePriority(b.payment_type)
            if (rankDiff !== 0) return rankDiff
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        return orders[0]
    } catch (err) {
        console.error('[getPreorderByEmail] Unexpected error:', err)
        return null
    }
}

// ── Display helpers ────────────────────────────────────────────────────────

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
    full_payment: 'Full Payment',
    deposit_50: '50% Reservation Deposit',
    waitlist_reservation: 'Waitlist Reservation',
}

export const FINANCIAL_STATUS_LABELS: Record<string, string> = {
    paid: 'Paid',
    authorized: 'Authorized',
    partially_refunded: 'Partially Refunded',
}
