import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ error: 'Server configuration error: Missing Supabase secrets' }, { status: 500 });
        }

        // Initialize Supabase Admin Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Initialize Resend
        const resendApiKey = process.env.RESEND_API_KEY;
        console.log("DEBUG: Checking Resend API Key:", resendApiKey ? "Present (" + resendApiKey.slice(0, 4) + "...)" : "Missing");

        let resend: Resend | null = null;
        if (resendApiKey) {
            resend = new Resend(resendApiKey);
        } else {
            console.warn('RESEND_API_KEY is missing. Emails will not be sent.');
        }

        // 1. Check if customer already exists to avoid overwriting their ID
        const { data: existingUser } = await supabase
            .from('Customer')
            .select('id, tags')
            .eq('email', email)
            .single();

        let error;

        if (existingUser) {
            // 2a. Update existing user: Append the tag if it's not already there
            const currentTags = existingUser.tags || [];
            if (!currentTags.includes('newsletter-5-off')) {
                const { error: updateError } = await supabase
                    .from('Customer')
                    .update({
                        tags: [...currentTags, 'newsletter-5-off']
                    })
                    .eq('id', existingUser.id);
                error = updateError;
            }
        } else {
            // 2b. Create new user
            const { error: insertError } = await supabase
                .from('Customer')
                .insert({
                    id: uuidv4(),
                    email: email,
                    name: '', // Optional based on your schema
                    tags: ['newsletter-5-off'],
                    createdAt: new Date().toISOString(),
                });
            error = insertError;
        }

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Send Welcome Email via Resend
        if (resend) {
            console.log("DEBUG: Attempting to send email to:", email);
            try {
                const emailResponse = await resend.emails.send({
                    from: 'DreamPlay <lionel@email.dreamplaypianos.com>',
                    to: email,
                    subject: 'Here is your Hand-Measuring Guide 🎹',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1>Welcome to DreamPlay!</h1>
                            <p>As promised, here is your printable guide to figuring out exactly what piano size fits your biology.</p>
                            
                            <div style="background-color: #f4f4f4; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
                                <a href="https://www.dropbox.com/scl/fi/9b72rbi4ga0pjterxyoan/DreamPlay-Infographic.pdf?rlkey=mc08i1ahn5tp3thdd0qjnag2d&st=olbh1t9w&dl=1" 
                                   style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
                                   Download PDF Guide
                                </a>
                            </div>

                            <p><strong>A surprise bonus for you...</strong></p>
                            <p>Because you're taking the first step toward pain-free playing, use the secret code <strong>WELCOME5</strong> at checkout to get an extra discount on top of the pre-order pricing.</p>

                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                            
                            <p style="font-size: 12px; color: #666;">
                                If this wasn't you who signed up, you can ignore this email or unsubscribe below.
                            </p>
                        </div>
                    `,
                });
                console.log("DEBUG: Email sent successfully. Response:", emailResponse);
            } catch (emailError) {
                // Log but don't fail the request since database update worked
                console.error('DEBUG: Failed to send email. Error:', emailError);
            }
        } else {
            console.log("DEBUG: Resend client not initialized, skipping email.");
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
