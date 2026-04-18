import { notFound, redirect } from 'next/navigation'
import PreorderUpdateAdminClient from './PreorderUpdateAdminClient'
import { getPreorderUpdateAudience } from '@/actions/preorder-update-actions'
import { createClient } from '@/lib/supabase/server'
import { isPreorderUpdateAdminEmail } from '@/lib/preorder-updates'

export const metadata = {
    title: 'Preorder Updates Admin | DreamPlay Pianos',
    robots: { index: false, follow: false },
}

export default async function PreorderUpdatesAdminPage() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (!user || error) {
        redirect('/login?next=/admin/preorder-updates')
    }

    if (!isPreorderUpdateAdminEmail(user.email)) {
        notFound()
    }

    const audience = await getPreorderUpdateAudience()
    const emailConfigured = Boolean(process.env.RESEND_API_KEY)

    return (
        <div className="min-h-screen bg-[#050505] px-6 py-12 text-white selection:bg-white/20 md:px-10">
            <div className="mx-auto max-w-6xl pt-8">
                <div className="mb-10 border-b border-white/10 pb-8">
                    <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/40">
                        DreamPlay Pianos · Internal Admin
                    </p>
                    <h1 className="mt-4 font-serif text-4xl tracking-tight text-white md:text-5xl">
                        Manual preorder updates
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
                        Smallest-safe V1 sender. It pulls deduped buyers from preorder_orders, keeps the trigger manual, and batches sends through Resend without exposing buyer email addresses to each other.
                    </p>
                </div>

                <PreorderUpdateAdminClient
                    viewerEmail={user.email!}
                    emailConfigured={emailConfigured}
                    audience={audience}
                />
            </div>
        </div>
    )
}
