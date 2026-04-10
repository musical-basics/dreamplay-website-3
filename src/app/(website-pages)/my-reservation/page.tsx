import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpecialOfferHeader } from "@/components/intro-offer/header";
import Footer from "@/components/Footer";
import ReservationDecisionModule from "./ReservationDecisionModule";
import ReservationPageClient from "./ReservationPageClient";
import { getReservationDecision } from "@/actions/reservation-actions";

export const metadata = {
    title: "My Reservation | DreamPlay Pianos",
    description: "Manage your DreamPlay reservation and choose your next steps.",
    robots: { index: false, follow: false }, // private buyer page — keep out of search
};

export default async function MyReservationPage() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
        redirect("/login?next=/my-reservation");
    }

    // Fetch existing decision server-side
    const existingDecision = await getReservationDecision(user.id);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20">
            <SpecialOfferHeader forceOpaque={true} darkMode={true} className="border-b border-white/10 bg-[#050505] backdrop-blur-md" />

            <main className="pt-32 pb-24">
                <div className="max-w-4xl mx-auto px-6">

                    {/* Page Header */}
                    <div className="mb-14">
                        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">
                            DreamPlay Pianos · Early Backer Portal
                        </p>
                        <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight text-white mb-5">
                            Your Reservation
                        </h1>
                        <p className="font-sans text-sm text-white/40">{user.email}</p>
                    </div>

                    {/* ── Reservation Decision Module ── */}
                    <ReservationDecisionModule
                        userId={user.id}
                        email={user.email ?? null}
                        existingDecision={existingDecision}
                    />

                    {/* Divider */}
                    <div className="h-px bg-white/5 my-16" />

                    {/* Production Timeline */}
                    <div className="border border-white/10 bg-white/[0.03] p-8 md:p-10 mb-12">
                        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/50 mb-6">Production Status</p>
                        <h2 className="font-serif text-2xl text-white mb-10">Your DreamPlay One Timeline</h2>

                        <div className="space-y-0">
                            {/* Stage 1 */}
                            <div className="flex gap-5">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-none border border-white/20 bg-white flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="w-px h-full bg-white/10 min-h-[48px]" />
                                </div>
                                <div className="pb-8">
                                    <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Stage 1 — Complete</p>
                                    <h3 className="font-sans font-bold text-white text-sm">Design &amp; Prototyping</h3>
                                    <p className="font-sans text-xs text-white/40 mt-1">Finalized the patented 15/16th key design and acoustic profiles.</p>
                                </div>
                            </div>

                            {/* Stage 2 */}
                            <div className="flex gap-5">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-none border border-white/30 bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                                    </div>
                                    <div className="w-px h-full bg-white/10 min-h-[48px]" />
                                </div>
                                <div className="pb-8">
                                    <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1">Stage 2 — In Progress</p>
                                    <h3 className="font-sans font-bold text-white text-sm">Steel Tooling &amp; Molds</h3>
                                    <p className="font-sans text-xs text-white/40 mt-1">Currently casting the custom 15/16th keys.</p>
                                </div>
                            </div>

                            {/* Stage 3 */}
                            <div className="flex gap-5">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-none border border-white/10 bg-transparent flex items-center justify-center flex-shrink-0">
                                        <span className="w-2 h-2 rounded-full bg-white/20" />
                                    </div>
                                    <div className="w-px h-full bg-white/10 min-h-[48px]" />
                                </div>
                                <div className="pb-8">
                                    <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-white/20 mb-1">Stage 3 — Pending</p>
                                    <h3 className="font-sans font-bold text-white/50 text-sm">Final Assembly</h3>
                                    <p className="font-sans text-xs text-white/30 mt-1">Quality assurance and final instrument assembly.</p>
                                </div>
                            </div>

                            {/* Stage 4 */}
                            <div className="flex gap-5">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-none border border-white/10 bg-transparent flex items-center justify-center flex-shrink-0">
                                        <span className="w-2 h-2 rounded-full bg-white/20" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-white/20 mb-1">Stage 4 — Target: Q4 2026</p>
                                    <h3 className="font-sans font-bold text-white/50 text-sm">Shipping &amp; Delivery</h3>
                                    <p className="font-sans text-xs text-white/30 mt-1">Your DreamPlay One arrives at your door.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Questions / Contact nudge */}
                    <div className="border border-white/5 bg-white/[0.02] p-8 text-center mb-8">
                        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-white/30 mb-3">Questions?</p>
                        <p className="font-sans text-sm text-white/50 mb-5 max-w-md mx-auto">
                            If you have any questions about your reservation or the options above, please reach out — we're happy to help.
                        </p>
                        <a
                            href="/contact"
                            className="inline-flex items-center gap-2 border border-white/20 px-8 py-3 font-sans text-xs uppercase tracking-widest text-white/60 hover:text-white hover:border-white/40 transition-colors"
                        >
                            Contact Us
                        </a>
                    </div>

                    {/* Sign Out */}
                    <ReservationPageClient />

                </div>
            </main>

            <Footer />
        </div>
    );
}
