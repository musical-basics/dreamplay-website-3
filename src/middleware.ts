import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { JOURNEY_CONFIGS, STANDARD_JOURNEY } from "@/config/journeys";

export async function middleware(request: NextRequest) {
    // ========================================================================
    // REFRESH SUPABASE AUTH SESSION (must run on every request)
    // ========================================================================
    const sessionResponse = await updateSession(request);

    const url = request.nextUrl;
    const pathname = url.pathname;

    // Skip Journey Engine for API routes, admin, and auth paths
    if (pathname.startsWith('/api') || pathname.startsWith('/admin') || pathname.startsWith('/api/auth')) {
        return sessionResponse;
    }

    // Skip static files
    if (pathname.match(/\.(.*)$/)) {
        return sessionResponse;
    }

    const searchParams = url.searchParams;

    // ========================================================================
    // PRIORITY #1: URL PARAMETERS (From Email Links - Instant, No DB Hit)
    // ========================================================================
    const forcedTest = searchParams.get("test");
    const forcedVariant = searchParams.get("variant");

    if (forcedTest && forcedVariant) {
        const pathRewrite = getVariantPath(pathname, forcedVariant);
        const cookieName = `ab_${forcedTest}`;

        if (pathRewrite && pathRewrite !== pathname) {
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = pathRewrite;
            rewriteUrl.searchParams.delete("test");
            rewriteUrl.searchParams.delete("variant");

            const response = NextResponse.rewrite(rewriteUrl);
            response.cookies.set(cookieName, forcedVariant, { maxAge: 60 * 60 * 24 * 30 });
            response.headers.set("x-ab-test-id", forcedTest);
            response.headers.set("x-ab-variant-id", forcedVariant);

            return response;
        }

        const response = NextResponse.next();
        response.cookies.set(cookieName, forcedVariant, { maxAge: 60 * 60 * 24 * 30 });
        response.headers.set("x-ab-test-id", forcedTest);
        response.headers.set("x-ab-variant-id", forcedVariant);
        return response;
    }

    // ========================================================================
    // PRIORITY #1.5: SID/CID COOKIE CAPTURE (params stay in URL)
    // Reads subscriber/campaign IDs from email links, saves to root-domain
    // cookies for cross-subdomain tracking. URL params are NOT stripped.
    // ========================================================================
    const sid = searchParams.get("sid");
    const cid = searchParams.get("cid");

    if (sid) {
        // Set root-domain cookies so all subdomains can read them
        const cookieOpts = {
            maxAge: 60 * 60 * 24 * 90, // 90 days
            path: "/",
            domain: ".dreamplaypianos.com",
            sameSite: "lax" as const,
        };

        // For localhost dev, don't set domain (browsers reject dotted localhost)
        const isLocal = request.headers.get("host")?.includes("localhost");
        if (isLocal) delete (cookieOpts as any).domain;

        // Continue without redirect — keep sid/cid in URL
        const passthrough = NextResponse.next();

        passthrough.cookies.set("dp_sid", sid, cookieOpts);
        if (cid) passthrough.cookies.set("dp_cid", cid, cookieOpts);

        // Safety net: store the full original URL (only on first touch)
        if (!request.cookies.get("dp_first_touch_url")) {
            passthrough.cookies.set(
                "dp_first_touch_url",
                url.pathname + url.search,
                cookieOpts
            );
        }

        // Attach auth cookies from session
        sessionResponse.cookies.getAll().forEach(c =>
            passthrough.cookies.set(c.name, c.value)
        );

        return passthrough;
    }

    // ========================================================================
    // PRIORITY #2: JOURNEY ENGINE (Full-Funnel Routing)
    // ========================================================================

    // 1. Load journeys from hardcoded config (zero latency, no DB hit, Edge-compatible)
    const activeJourneys = JOURNEY_CONFIGS;

    // 2. Identify or Assign Journey
    let assignedJourneyId = request.cookies.get("dp_journey_id")?.value;

    // Feature: Force a journey via URL for your Ads (e.g., ?journey=journey_a)
    const forcedJourney = url.searchParams.get("journey");
    if (forcedJourney) assignedJourneyId = forcedJourney;

    let assignedJourney = activeJourneys.find((j: any) => j.id === assignedJourneyId);

    // ==========================================
    // 🛡️ SEO PROTECTION: THE BOT BYPASS
    // ==========================================
    const userAgent = request.headers.get("user-agent") || "";
    const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);

    if (isBot) {
        // ALWAYS serve the explicit standard-priced journey to search engines
        // to prevent discounted prices from being indexed in Google Search Results.
        assignedJourney = STANDARD_JOURNEY;
    }
    // ==========================================

    // 3. Otherwise, assign humans randomly based on weights
    else if (!assignedJourney && activeJourneys.length > 0) {
        const totalWeight = activeJourneys.reduce((sum: number, j: any) => sum + j.weight, 0);
        let random = Math.random() * totalWeight;
        for (const j of activeJourneys) {
            random -= j.weight;
            if (random <= 0) {
                assignedJourney = j;
                break;
            }
        }
    }

    let response = NextResponse.next();

    if (assignedJourney) {
        // Rewrite root to their assigned Homepage
        if (pathname === "/") {
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = assignedJourney.homepage;
            response = NextResponse.rewrite(rewriteUrl);
        }

        // Universal Checkout Router: Rewrite /buy to their assigned Checkout
        if (pathname === "/buy") {
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = assignedJourney.checkout;
            response = NextResponse.rewrite(rewriteUrl);
        }

        // Set stateful cookies so frontend components know what to render
        // Bots don't accept cookies, so this only applies to humans
        if (!isBot) {
            response.cookies.set("dp_journey_id", assignedJourney.id, { maxAge: 31536000 });
        }
    } else {
        // Ultimate Fallback if JOURNEY_CONFIGS is empty — serve STANDARD_JOURNEY homepage
        if (pathname === "/") {
            const fallback = request.nextUrl.clone();
            fallback.pathname = STANDARD_JOURNEY.homepage;
            response = NextResponse.rewrite(fallback);
        }
    }

    // Attach auth cookies from updateSession
    sessionResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
    return response;
}

/**
 * Helper: Get the variant path from a hardcoded mapping.
 * Used for instant overrides via email links.
 */
function getVariantPath(currentPath: string, variant: string): string | null {
    if (variant === "control" || variant === "a") {
        return null;
    }
    const basePath = currentPath.replace(/\/$/, "");
    const suffix = variant.replace("variant_", "");
    return `${basePath}-${suffix}`;
}

export const config = {
    matcher: [
        // Exclude Next Static files AND media folders to save processing time
        "/((?!_next/static|_next/image|images|videos|favicon.ico).*)",
    ],
};
