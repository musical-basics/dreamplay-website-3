import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Service Role or Anon, but Anon is fine if RLS is set to public insert)
// Using process.env vars directly
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { eventType, metadata, url, sessionId } = await request.json();

        if (!url || !eventType || !sessionId) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // 1. Check DB for active tests on this path
        // Note: In high scale, cache this lookup
        const { data: activeTest, error: testError } = await supabase
            .from("ab_tests")
            .select("*, ab_variants(*)")
            .eq("target_path", url)
            .eq("status", "active")
            .single();

        if (testError || !activeTest) {
            // It's possible there is no test active for this URL, just ignore.
            return NextResponse.json({ message: "No active test found" }, { status: 200 });
        }

        // 2. Identify the Variant
        // The middleware sets a cookie: ab_<slug> = <variant_id>
        const cookieName = `ab_${activeTest.slug}`;
        const variantId = request.cookies.get(cookieName)?.value;

        if (!variantId) {
            // This might happen if the cookie was deleted or blocked
            return NextResponse.json({ message: "No variant cookie found" }, { status: 200 });
        }

        // 3. Insert Event
        const { error: insertError } = await supabase.from("ab_events").insert({
            test_id: activeTest.id,
            variant_id: variantId,
            session_id: sessionId,
            event_type: eventType,
            metadata: metadata,
        });

        if (insertError) {
            console.error("Error inserting AB event:", insertError);
            return NextResponse.json({ message: "Database error" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in track-ab route:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
