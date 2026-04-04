import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Return chatbot suggested questions
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'chatbot_suggestions')
            .single();

        if (error) {
            if (error.code === 'PGRST116') return NextResponse.json({ suggestions: [] });
            throw error;
        }

        const suggestions = JSON.parse(data?.value || '[]');
        return NextResponse.json({ suggestions });
    } catch {
        return NextResponse.json({ suggestions: [] });
    }
}
