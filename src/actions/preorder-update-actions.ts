'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
} from '@/lib/preorder-updates'
import type { PreorderOrder } from '@/lib/preorders'

const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
            message: 'You must be signed in as an allowed admin to preview preorder updates.',
        }
    }

    if (!isPreorderUpdateAdminEmail(user.email)) {
        return {
            ok: false,
            message: 'This account is not allowed to preview preorder updates.',
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
        .map(
            (paragraph) =>
                `<p style="margin: 0 0 16px; color: #444; line-height: 1.7;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`
        )
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

export async function previewPreorderUpdateDraft(
    _previousState: PreorderUpdateActionState,
    formData: FormData
): Promise<PreorderUpdateActionState> {
    const scope = normalizePreorderAudienceScope(formData.get('scope'))
    const subject = normalizeTextInput(formData.get('subject'))
    const message = normalizeTextInput(formData.get('message'))

    const baseState: PreorderUpdateActionState = {
        ...INITIAL_PREORDER_UPDATE_ACTION_STATE,
        scope,
    }

    const admin = await getAuthorizedAdminUser()
    if (!admin.ok) {
        return {
            ...baseState,
            message: admin.message,
        }
    }

    if (!subject) {
        return {
            ...baseState,
            message: 'Add a subject before previewing the draft.',
        }
    }

    if (!message) {
        return {
            ...baseState,
            message: 'Add the update message before previewing the draft.',
        }
    }

    const audience = filterPreorderUpdateAudience(await getPreorderUpdateAudience(), scope)
    const previewHtml = buildEmailHtml(subject, message)
    const previewText = buildEmailText(subject, message)
    const zeroAudience = audience.length === 0

    return {
        success: true,
        message: zeroAudience
            ? `Draft preview ready, but ${getPreorderUpdateScopeLabel(scope).toLowerCase()} currently has 0 buyers. Safe mode only, no email has been sent.`
            : `Draft preview ready for ${audience.length} preorder buyer(s). Safe mode only, no email has been sent.`,
        mode: 'preview',
        scope,
        audienceCount: audience.length,
        previewSubject: subject,
        previewMessage: message,
        previewHtml,
        previewText,
    }
}
