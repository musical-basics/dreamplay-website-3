import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Create session or add a message
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { session_id, role, content, email, page_url } = body;

        // Create new session
        if (!session_id) {
            const { data, error } = await supabase
                .from('chat_sessions')
                .insert({
                    page_url: page_url || null,
                    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
                })
                .select('id')
                .single();

            if (error) throw error;
            return NextResponse.json({ session_id: data.id });
        }

        // Add message to existing session
        if (role && content) {
            const { error: msgError } = await supabase
                .from('chat_messages')
                .insert({ session_id, role, content });

            if (msgError) throw msgError;

            // Update session metadata
            await supabase
                .from('chat_sessions')
                .update({
                    updated_at: new Date().toISOString(),
                    message_count: undefined, // handled by incrementing below
                })
                .eq('id', session_id);

            // Increment message count
            const { data: session } = await supabase
                .from('chat_sessions')
                .select('message_count')
                .eq('id', session_id)
                .single();

            await supabase
                .from('chat_sessions')
                .update({
                    message_count: (session?.message_count || 0) + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', session_id);
        }

        // Save email if provided
        if (email) {
            await supabase
                .from('chat_sessions')
                .update({ email, updated_at: new Date().toISOString() })
                .eq('id', session_id);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Chat session error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET: Check session status (for admin takeover detection)
export async function GET(req: Request) {
    const url = new URL(req.url);
    const session_id = url.searchParams.get('session_id');

    if (!session_id) {
        return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('chat_sessions')
        .select('status, admin_takeover_at')
        .eq('id', session_id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if admin took over within last 24 hours
    let adminActive = false;
    if (data?.admin_takeover_at) {
        const takeoverTime = new Date(data.admin_takeover_at).getTime();
        const now = Date.now();
        adminActive = (now - takeoverTime) < 24 * 60 * 60 * 1000;
    }

    return NextResponse.json({ status: data?.status, adminActive });
}
