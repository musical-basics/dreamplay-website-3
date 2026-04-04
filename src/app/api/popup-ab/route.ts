import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { action, bucket, offer_type } = body

        const forwardedFor = req.headers.get('x-forwarded-for')
        const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'

        // ─── ASSIGN ───
        if (action === 'assign') {
            const { data: configRow } = await supabase
                .from('admin_variables')
                .select('value')
                .eq('key', 'popup_ab_config')
                .single()

            const config = configRow
                ? JSON.parse(configRow.value)
                : {
                    enabled: false,
                    mode: 'random',
                    control: { entries: [{ type: 'pdf', delaySec: 30 }, { type: 'shipping', delaySec: 300 }] },
                    variant: { entries: [{ type: 'shipping', delaySec: 30 }, { type: 'pdf', delaySec: 300 }] },
                }

            if (!config.enabled) {
                return NextResponse.json({ bucket: 'control', settings: config.control })
            }

            let assignedBucket: 'control' | 'variant'

            if (config.mode === 'deterministic') {
                // Read the alternator, flip it, save it back
                const { data: altRow } = await supabase
                    .from('admin_variables')
                    .select('value')
                    .eq('key', 'popup_ab_alternator')
                    .single()

                const current = altRow?.value || 'control'
                assignedBucket = current === 'control' ? 'variant' : 'control'

                await supabase
                    .from('admin_variables')
                    .upsert({
                        key: 'popup_ab_alternator',
                        value: assignedBucket,
                        updated_at: new Date().toISOString(),
                    })
            } else {
                assignedBucket = Math.random() < 0.5 ? 'control' : 'variant'
            }

            return NextResponse.json({
                bucket: assignedBucket,
                settings: config[assignedBucket],
            })
        }

        // ─── QUALIFY ───
        if (action === 'qualify') {
            await supabase.from('analytics_logs').insert({
                event_name: 'popup_ab_qualify',
                path: '/api/popup-ab',
                ip_address: ip,
                metadata: { bucket },
            })
            return NextResponse.json({ ok: true })
        }

        // ─── CONVERT ───
        if (action === 'convert') {
            await supabase.from('analytics_logs').insert({
                event_name: 'popup_ab_convert',
                path: '/api/popup-ab',
                ip_address: ip,
                metadata: { bucket, offer_type },
            })
            return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error: any) {
        console.error('[popup-ab] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
