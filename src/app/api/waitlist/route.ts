import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    console.log("WAITLIST_API: Received request");
    try {
        const { fullName, email } = await request.json();
        console.log("WAITLIST_API: Info received", { fullName, email });

        if (!fullName || !email) {
            console.error("WAITLIST_API: Missing name or email");
            return NextResponse.json({ error: 'Full name and Email are required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log("WAITLIST_API: Env check", {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            keyPrefix: supabaseKey ? supabaseKey.slice(0, 5) + '...' : 'N/A'
        });

        if (!supabaseUrl || !supabaseKey) {
            console.error('WAITLIST_API: Missing Supabase environment variables');
            return NextResponse.json({ error: 'Server configuration error: Missing Supabase secrets' }, { status: 500 });
        }

        // Initialize Supabase Admin Client
        const supabase = createClient(
            supabaseUrl,
            supabaseKey
        );

        // Insert into Waitlist table
        console.log("WAITLIST_API: Attempting insert into Waitlist table...");
        const { error } = await supabase
            .from('Waitlist')
            .insert({
                full_name: fullName,
                email: email,
            });

        if (error) {
            console.error('WAITLIST_API: Supabase insert error:', error);
            console.error('WAITLIST_API: Error details:', JSON.stringify(error, null, 2));
            return NextResponse.json({ error: error.message, details: error }, { status: 500 });
        }

        console.log("WAITLIST_API: Insert successful");
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('WAITLIST_API: Uncaught API Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
