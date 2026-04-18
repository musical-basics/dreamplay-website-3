'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createClient as createAppClient } from '@/lib/supabase/server'
import {
    buildPreorderUpdateAudience,
    filterPreorderUpdateAudience,
    getPreorderUpdateScopeLabel,
    INITIAL_PREORDER_UPDATE_ACTION_STATE,
    isPreorderUpdateAdminEmail,
    normalizePreorderAudienceScope,
    type PreorderUpdateActionState,
    type PreorderUpdateAudienceMember,
    type PreorderUpdateSendMode,
} from '@/lib/preorder-updates'
import type { PreorderOrder } from '@/lib/preorders'

const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FROM_EMAIL = 'Lionel at DreamPlay <support@dreamplaypianos.com>'
const DEFAULT_TO_EMAIL = 'support@dreamplaypianos.com'
const BATCH_SIZE = 25

export async function getPreorderUpdateAudience(): Promise<PreorderUpdateAudienceMember[]> {
    const { data, error } = await supabase
        .from('preorder_orders')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[getPreorderUpdateAudience] DB error:', error.message)
        return []
    }

    return buildPreorderUpdateAudience((data ?? []) as PreorderOrder[])
}

async function getAuthorizedAdminUser(): Promise<
    { ok: true; email: string } | { ok: false; message: string }
> {
    const supabaseApp = await createAppClient()
    const {
        data: { user },
        error,
    } = await supabaseApp.auth.getUser()

    if (error || !user?.email) {
        return {
            ok: false,
            message: 'You must be signed in as an allowed admin to send preorder updates.',
        }
    }

    if (!isPreorderUpdateAdminEmail(user.email)) {
        return {
            ok: false,
            message: 'This account is not allowed to use the preorder update sender.',
        }
    }

    return { ok: true, email: user.email.toLowerCase().trim() }
}

function normalizeTextInput(value: FormDataEntryValue | null): string {
    return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function buildEmailBodyHtml(message: string): string {
    return message
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p style="margin: 0 0 16px; color: #444; line-height: 1.7;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
        .join('')
}

function buildEmailHtml(subject: string, message: string): string {
    return `
        <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 40px 24px; color: #111; background: #fff;">
            <p style="font-family: sans-serif; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #999; margin: 0 0 32px;">
                DreamPlay Pianos
            </p>

            <h1 style="font-size: 28px; font-weight: normal; margin: 0 0 24px; line-height: 1.3; color: #111;">
                ${escapeHtml(subject)}
            </h1>

            ${buildEmailBodyHtml(message)}

            <p style="margin: 32px 0 8px; color: #444; line-height: 1.7;">With gratitude,</p>
            <p style="margin: 0; color: #444; line-height: 1.7;">Lionel Yu<br />Founder, DreamPlay Pianos</p>

            <hr style="margin: 36px 0 20px; border: none; border-top: 1px solid #eee;" />
            <p style="font-family: sans-serif; font-size: 11px; color: #999; margin: 0; line-height: 1.6;">
                You are receiving this because you placed a DreamPlay preorder or reservation.
            </p>
        </div>
    `
}

function buildEmailText(subject: string, message: string): string {
    return `${subject}\n\n${message.trim()}\n\nWith gratitude,\nLionel Yu\nFounder, DreamPlay Pianos\n\nYou are receiving this because you placed a DreamPlay preorder or reservation.`
}

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = []

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size))
    }

    return chunks
}

export async function sendPreorderUpdate(
    _previousState: PreorderUpdateActionState,
    formData: FormData
): Promise<PreorderUpdateActionState> {
    const scope = normalizePreorderAudienceScope(formData.get('scope'))
    const mode: PreorderUpdateSendMode =
        formData.get('mode') === 'test' ? 'test' : 'broadcast'
    const subject = normalizeTextInput(formData.get('subject'))
    const message = normalizeTextInput(formData.get('message'))

    const unauthorizedState: PreorderUpdateActionState = {
        ...INITIAL_PREORDER_UPDATE_ACTION_STATE,
        scope,
        mode,
    }

    const admin = await getAuthorizedAdminUser()
    if (!admin.ok) {
        return {
            ...unauthorizedState,
            message: admin.message,
        }
    }

    if (!subject) {
        return {
            ...unauthorizedState,
            audienceCount: 0,
            message: 'Add a subject before sending.',
        }
    }

    if (!message) {
        return {
            ...unauthorizedState,
            audienceCount: 0,
            message: 'Add the update message before sending.',
        }
    }

    const audience = filterPreorderUpdateAudience(await getPreorderUpdateAudience(), scope)

    if (mode === 'broadcast' && audience.length === 0) {
        return {
            ...unauthorizedState,
            audienceCount: 0,
            message: `No preorder buyers match ${getPreorderUpdateScopeLabel(scope).toLowerCase()}.`,
        }
    }

    if (mode === 'broadcast' && formData.get('confirmSend') !== 'on') {
        return {
            ...unauthorizedState,
            audienceCount: audience.length,
            message: `Check the confirmation box before emailing ${audience.length} buyers.`,
        }
    }

    if (!process.env.RESEND_API_KEY) {
        return {
            ...unauthorizedState,
            audienceCount: audience.length,
            message: 'RESEND_API_KEY is not configured. Audience preview works, but sending is blocked until Resend is configured.',
        }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = buildEmailHtml(subject, message)
    const text = buildEmailText(subject, message)

    if (mode === 'test') {
        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: [admin.email],
                replyTo: admin.email,
                subject,
                html,
                text,
            })

            return {
                success: true,
                message: `Test email sent to ${admin.email}.`,
                mode,
                scope,
                audienceCount: audience.length,
                sentCount: 1,
                failedCount: 0,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown email error'
            console.error('[sendPreorderUpdate:test] Resend error:', errorMessage)
            return {
                ...unauthorizedState,
                audienceCount: audience.length,
                message: `Test send failed: ${errorMessage}`,
            }
        }
    }

    let sentCount = 0
    let failedCount = 0

    for (const recipientBatch of chunk(
        audience.map((member) => member.email),
        BATCH_SIZE
    )) {
        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: [DEFAULT_TO_EMAIL],
                bcc: recipientBatch,
                replyTo: admin.email,
                subject,
                html,
                text,
            })

            sentCount += recipientBatch.length
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown email error'
            failedCount += recipientBatch.length
            console.error('[sendPreorderUpdate:broadcast] Resend batch error:', errorMessage)
        }
    }

    if (failedCount > 0) {
        return {
            success: false,
            message: `Email sent to ${sentCount} buyers, but ${failedCount} failed. Check server logs before retrying.`,
            mode,
            scope,
            audienceCount: audience.length,
            sentCount,
            failedCount,
        }
    }

    return {
        success: true,
        message: `Email sent to ${sentCount} preorder buyers in ${chunk(audience, BATCH_SIZE).length} batch(es).`,
        mode,
        scope,
        audienceCount: audience.length,
        sentCount,
        failedCount: 0,
    }
}
