import {
    getPrimaryPreordersByEmail,
    PAYMENT_TYPE_LABELS,
    type PaymentType,
    type PreorderAudienceScope,
    type PreorderOrder,
} from '@/lib/preorders'

export interface PreorderUpdateAudienceMember {
    email: string
    customer_name: string | null
    order_name: string
    payment_type: PaymentType
    financial_status: string | null
    fulfillment_status: string | null
    total_paid_usd: number | null
    created_at: string
}

export type PreorderUpdateSendMode = 'test' | 'broadcast'

export interface PreorderUpdateActionState {
    success: boolean
    message: string | null
    mode: PreorderUpdateSendMode
    scope: PreorderAudienceScope
    audienceCount: number
    sentCount: number
    failedCount: number
}

export const INITIAL_PREORDER_UPDATE_ACTION_STATE: PreorderUpdateActionState = {
    success: false,
    message: null,
    mode: 'broadcast',
    scope: 'all',
    audienceCount: 0,
    sentCount: 0,
    failedCount: 0,
}

const FALLBACK_ADMIN_EMAILS = ['lionel@musicalbasics.com']

export function normalizePreorderAudienceScope(
    value: FormDataEntryValue | string | null | undefined
): PreorderAudienceScope {
    if (
        value === 'full_payment' ||
        value === 'deposit_50' ||
        value === 'waitlist_reservation'
    ) {
        return value
    }

    return 'all'
}

export function getPreorderUpdateScopeLabel(scope: PreorderAudienceScope): string {
    if (scope === 'all') return 'All preorder buyers'
    return PAYMENT_TYPE_LABELS[scope]
}

export function getAllowedPreorderUpdateAdminEmails(): string[] {
    const configured = process.env.PREORDER_UPDATE_ADMIN_EMAILS
        ?.split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)

    if (configured && configured.length > 0) {
        return configured
    }

    return FALLBACK_ADMIN_EMAILS
}

export function isPreorderUpdateAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false
    return getAllowedPreorderUpdateAdminEmails().includes(email.toLowerCase().trim())
}

export function buildPreorderUpdateAudience(
    orders: PreorderOrder[]
): PreorderUpdateAudienceMember[] {
    return getPrimaryPreordersByEmail(orders).map((order) => ({
        email: order.email,
        customer_name: order.customer_name,
        order_name: order.order_name,
        payment_type: order.payment_type,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        total_paid_usd: order.total_paid_usd,
        created_at: order.created_at,
    }))
}

export function filterPreorderUpdateAudience(
    audience: PreorderUpdateAudienceMember[],
    scope: PreorderAudienceScope
): PreorderUpdateAudienceMember[] {
    if (scope === 'all') return audience
    return audience.filter((member) => member.payment_type === scope)
}
