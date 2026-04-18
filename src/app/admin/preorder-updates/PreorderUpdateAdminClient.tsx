'use client'

import { useActionState, useMemo, useState } from 'react'
import { FileText, Loader2, Mail, ShieldAlert } from 'lucide-react'
import { previewPreorderUpdateDraft } from '@/actions/preorder-update-actions'
import {
    filterPreorderUpdateAudience,
    getPreorderUpdateScopeLabel,
    INITIAL_PREORDER_UPDATE_ACTION_STATE,
    type PreorderUpdateActionState,
    type PreorderUpdateAudienceMember,
} from '@/lib/preorder-updates'
import type { PreorderAudienceScope } from '@/lib/preorders'

interface PreorderUpdateAdminClientProps {
    viewerEmail: string
    audience: PreorderUpdateAudienceMember[]
}

const SCOPE_OPTIONS: PreorderAudienceScope[] = [
    'all',
    'full_payment',
    'deposit_50',
    'waitlist_reservation',
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
})

function formatAmount(value: number | null): string {
    if (value == null) return '—'
    return currencyFormatter.format(value)
}

function formatStatus(
    financialStatus: string | null,
    fulfillmentStatus: string | null
): string {
    const statuses = [financialStatus, fulfillmentStatus].filter(Boolean)
    if (!statuses.length) return '—'
    return statuses.join(' · ')
}

function ResultBanner({ state }: { state: PreorderUpdateActionState }) {
    if (!state.message) return null

    return (
        <div
            className={`border px-4 py-3 text-sm ${
                state.success
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
            }`}
        >
            {state.message}
        </div>
    )
}

function DraftPreview({ state }: { state: PreorderUpdateActionState }) {
    if (!state.previewHtml || !state.previewText) return null

    return (
        <section className="border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/40">
                        Draft preview
                    </p>
                    <p className="mt-3 text-sm text-white/60">
                        Audience snapshot: <span className="text-white">{state.audienceCount}</span> recipient(s) · safe mode only
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-white/40">
                    <ShieldAlert className="h-4 w-4" />
                    Sending disabled
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="border border-white/10 bg-white p-4 text-black shadow-2xl shadow-black/20">
                    <div dangerouslySetInnerHTML={{ __html: state.previewHtml }} />
                </div>

                <div className="space-y-4">
                    <div className="border border-white/10 bg-black/20 p-4">
                        <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-white/35">
                            Subject
                        </p>
                        <p className="mt-3 text-sm text-white">{state.previewSubject}</p>
                    </div>

                    <div className="border border-white/10 bg-black/20 p-4">
                        <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-white/35">
                            Plain-text version
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">
                            {state.previewText}
                        </pre>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function PreorderUpdateAdminClient({
    viewerEmail,
    audience,
}: PreorderUpdateAdminClientProps) {
    const [scope, setScope] = useState<PreorderAudienceScope>('all')
    const [state, formAction, isPending] = useActionState(
        previewPreorderUpdateDraft,
        INITIAL_PREORDER_UPDATE_ACTION_STATE
    )

    const filteredAudience = useMemo(
        () => filterPreorderUpdateAudience(audience, scope),
        [audience, scope]
    )

    const audienceCounts = useMemo(
        () => ({
            all: audience.length,
            full_payment: filterPreorderUpdateAudience(audience, 'full_payment').length,
            deposit_50: filterPreorderUpdateAudience(audience, 'deposit_50').length,
            waitlist_reservation: filterPreorderUpdateAudience(audience, 'waitlist_reservation').length,
        }),
        [audience]
    )

    return (
        <div className="space-y-8">
            <div className="border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                Safe mode only. This screen can draft and preview a preorder update, but it cannot send email.
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                {SCOPE_OPTIONS.map((option) => {
                    const count = audienceCounts[option]
                    const isActive = scope === option

                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setScope(option)}
                            className={`border p-4 text-left transition-colors ${
                                isActive
                                    ? 'border-white/40 bg-white/10 text-white'
                                    : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                        >
                            <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-white/40">
                                Audience
                            </p>
                            <p className="mt-3 text-sm text-white">{getPreorderUpdateScopeLabel(option)}</p>
                            <p className="mt-1 font-sans text-2xl text-white">{count}</p>
                        </button>
                    )
                })}
            </div>

            <form action={formAction} className="space-y-6 border border-white/10 bg-white/[0.03] p-6 md:p-8">
                <input type="hidden" name="scope" value={scope} />

                <div>
                    <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/40">
                        Compose draft
                    </p>
                    <p className="mt-3 text-sm text-white/60">
                        Current audience: <span className="text-white">{getPreorderUpdateScopeLabel(scope)}</span> · {filteredAudience.length} recipient(s)
                    </p>
                    <p className="mt-2 text-xs text-white/35">
                        Preview generation is server-rendered only. No test send and no broadcast send exist in this safe-mode version.
                    </p>
                </div>

                <ResultBanner state={state} />

                <div className="space-y-2">
                    <label htmlFor="preorder-update-subject" className="font-sans text-xs uppercase tracking-[0.18em] text-white/60">
                        Subject
                    </label>
                    <input
                        id="preorder-update-subject"
                        name="subject"
                        type="text"
                        maxLength={120}
                        required
                        placeholder="Production update for DreamPlay preorder buyers"
                        className="w-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/30"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="preorder-update-message" className="font-sans text-xs uppercase tracking-[0.18em] text-white/60">
                        Message
                    </label>
                    <textarea
                        id="preorder-update-message"
                        name="message"
                        required
                        rows={12}
                        placeholder={`Hi,\n\nHere’s a quick update on DreamPlay production...\n\nThank you again for your patience and support.`}
                        className="w-full border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/30"
                    />
                    <p className="text-xs text-white/35">
                        Plain text only in V1. Paragraph breaks are preserved in the preview.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-2 border border-white bg-white px-5 py-3 text-xs uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/25"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileText className="h-4 w-4" />
                        )}
                        Generate draft preview
                    </button>
                </div>
            </form>

            <DraftPreview state={state} />

            <section className="border border-white/10 bg-white/[0.03] p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/40">
                            Recipient preview
                        </p>
                        <p className="mt-3 text-sm text-white/60">
                            Showing the first {Math.min(filteredAudience.length, 20)} of {filteredAudience.length} deduped recipient(s).
                        </p>
                    </div>
                    <div className="hidden items-center gap-2 text-xs text-white/35 md:flex">
                        <Mail className="h-4 w-4" />
                        Authenticated as {viewerEmail}
                    </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/75">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                <th className="pb-3 pr-4 font-medium">Buyer</th>
                                <th className="pb-3 pr-4 font-medium">Order</th>
                                <th className="pb-3 pr-4 font-medium">Payment</th>
                                <th className="pb-3 pr-4 font-medium">Status</th>
                                <th className="pb-3 font-medium">Paid</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredAudience.slice(0, 20).map((member) => (
                                <tr key={member.email}>
                                    <td className="py-3 pr-4 align-top">
                                        <div className="font-medium text-white">{member.customer_name || 'Unknown buyer'}</div>
                                        <div className="text-xs text-white/45">{member.email}</div>
                                    </td>
                                    <td className="py-3 pr-4 align-top text-white/65">{member.order_name}</td>
                                    <td className="py-3 pr-4 align-top text-white/65">{getPreorderUpdateScopeLabel(member.payment_type)}</td>
                                    <td className="py-3 pr-4 align-top text-white/55">
                                        {formatStatus(member.financial_status, member.fulfillment_status)}
                                    </td>
                                    <td className="py-3 align-top text-white/85">{formatAmount(member.total_paid_usd)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredAudience.length === 0 && (
                        <div className="border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                            No recipients match this audience filter.
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
