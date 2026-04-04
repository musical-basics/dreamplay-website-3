'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Initialize Supabase Admin Client
// Using service_role key to ensure we have permission to manage admin variables
// This should only be used in secure server actions
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getCountdownDate() {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'countdown_end_date')
            .single()

        if (error) {
            console.error('Error fetching countdown date:', error)
            return null
        }

        return data?.value || null
    } catch (error) {
        console.error('Failed to get countdown date:', error)
        return null
    }
}

export async function updateCountdownDate(date: string) {
    try {
        // Simple validation for ISO string
        const d = new Date(date)
        if (isNaN(d.getTime())) {
            throw new Error('Invalid date format')
        }

        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'countdown_end_date',
                value: date,
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating countdown date:', error)
            throw new Error(error.message)
        }

        return { success: true }
    } catch (error: any) {
        console.error('Failed to update countdown date:', error)
        return { success: false, error: error.message }
    }
}

export async function getDiscountPopupStatus() {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'show_discount_popup')
            .single()

        if (error) {
            // If key doesn't exist, default to true
            if (error.code === 'PGRST116') return 'true'
            console.error('Error fetching discount status:', error)
            return 'true'
        }

        return data?.value || 'true'
    } catch (error) {
        console.error('Failed to get discount status:', error)
        return 'true'
    }
}

export async function updateDiscountPopupStatus(enabled: boolean) {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'show_discount_popup',
                value: String(enabled),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating discount status:', error)
            throw new Error(error.message)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getHomepageVersion() {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'homepage_version')
            .single()

        if (error) {
            // Default to intro-offer if not set
            if (error.code === 'PGRST116') return 'intro-offer'
            console.error('Error fetching homepage version:', error)
            return 'intro-offer'
        }

        return data?.value || 'intro-offer'
    } catch (error) {
        console.error('Failed to get homepage version:', error)
        return 'special-offer'
    }
}

export async function updateHomepageVersion(version: 'old' | 'intro-offer') {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'homepage_version',
                value: version,
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating homepage version:', error)
            throw new Error(error.message)
        }

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function loginAdmin(password: string) {
    if (password === 'sorenkier') {
        // In a real app we'd use cookies() from next/headers to set a session
        // For this simple request, we'll verify and return success, letting client handle persistence
        return { success: true }
    }
    return { success: false, error: 'Invalid password' }
}

export async function getCustomizePageUrls() {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('key, value')
            .in('key', ['customize_url_bundle', 'customize_url_solo', 'customize_url_reservation'])

        if (error) {
            console.error('Error fetching customize URLs:', error)
            return {
                bundle: '',
                solo: '',
                reservation: ''
            }
        }

        // Initialize with emptiness
        const urlMap: Record<string, string> = {
            'customize_url_bundle': '',
            'customize_url_solo': '',
            'customize_url_reservation': ''
        }

        data?.forEach((row: { key: string, value: string }) => {
            urlMap[row.key] = row.value
        })

        return {
            bundle: urlMap['customize_url_bundle'],
            solo: urlMap['customize_url_solo'],
            reservation: urlMap['customize_url_reservation']
        }
    } catch (error) {
        console.error('Failed to get customize URLs:', error)
        return {
            bundle: '',
            solo: '',
            reservation: ''
        }
    }
}

export async function updateCustomizePageUrls(urls: { bundle: string, solo: string, reservation: string }) {
    try {
        const updates = [
            { key: 'customize_url_bundle', value: urls.bundle, updated_at: new Date().toISOString() },
            { key: 'customize_url_solo', value: urls.solo, updated_at: new Date().toISOString() },
            { key: 'customize_url_reservation', value: urls.reservation, updated_at: new Date().toISOString() }
        ]

        const { error } = await supabase
            .from('admin_variables')
            .upsert(updates)

        if (error) {
            console.error('Error updating customize URLs:', error)
            throw new Error(error.message)
        }

        revalidatePath('/customize')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getHiddenProducts(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'hidden_products')
            .single()

        if (error) {
            if (error.code === 'PGRST116') return ['reservation'] // default: reservation hidden
            console.error('Error fetching hidden products:', error)
            return ['reservation']
        }

        return JSON.parse(data?.value || '["reservation"]')
    } catch (error) {
        console.error('Failed to get hidden products:', error)
        return ['reservation']
    }
}

export async function updateHiddenProducts(hiddenIds: string[]) {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'hidden_products',
                value: JSON.stringify(hiddenIds),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating hidden products:', error)
            throw new Error(error.message)
        }

        revalidatePath('/customize')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getChatbotEnabled(): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'show_chatbot')
            .single()

        if (error) {
            if (error.code === 'PGRST116') return true // default on
            console.error('Error fetching chatbot enabled status:', error)
            return true
        }

        return data?.value === 'true'
    } catch (error) {
        console.error('Failed to get chatbot enabled status:', error)
        return true
    }
}

export async function updateChatbotEnabled(enabled: boolean) {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'show_chatbot',
                value: String(enabled),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating chatbot enabled status:', error)
            throw new Error(error.message)
        }

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getChatModel(): Promise<string> {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'chatbot_model')
            .single()

        if (error) {
            if (error.code === 'PGRST116') return 'google:gemini-2.5-flash'
            console.error('Error fetching chat model:', error)
            return 'google:gemini-2.5-flash'
        }

        return data?.value || 'google:gemini-2.5-flash'
    } catch (error) {
        console.error('Failed to get chat model:', error)
        return 'google:gemini-2.5-flash'
    }
}

export async function updateChatModel(model: string) {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'chatbot_model',
                value: model,
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating chat model:', error)
            throw new Error(error.message)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getChatKnowledge(): Promise<string> {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'chatbot_knowledge')
            .single()

        if (error) {
            if (error.code === 'PGRST116') return ''
            console.error('Error fetching chat knowledge:', error)
            return ''
        }

        return data?.value || ''
    } catch (error) {
        console.error('Failed to get chat knowledge:', error)
        return ''
    }
}

export async function updateChatKnowledge(knowledge: string) {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'chatbot_knowledge',
                value: knowledge,
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating chat knowledge:', error)
            throw new Error(error.message)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getChatSuggestions(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'chatbot_suggestions')
            .single()

        if (error) {
            if (error.code === 'PGRST116') return []
            console.error('Error fetching chat suggestions:', error)
            return []
        }

        try {
            return JSON.parse(data?.value || '[]')
        } catch {
            return []
        }
    } catch (error) {
        console.error('Failed to get chat suggestions:', error)
        return []
    }
}

export async function updateChatSuggestions(suggestions: string[]) {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'chatbot_suggestions',
                value: JSON.stringify(suggestions),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating chat suggestions:', error)
            throw new Error(error.message)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ─── Popup A/B Testing Types ───

export type PopupEntry = {
    type: string      // 'shipping' | 'pdf'
    delaySec: number  // Delay in seconds from page load
}

export type PopupSetting = {
    entries: PopupEntry[]
}

export type PopupABConfig = {
    enabled: boolean
    mode: 'random' | 'deterministic'
    control: PopupSetting
    variant: PopupSetting
}

const DEFAULT_AB_CONFIG: PopupABConfig = {
    enabled: false,
    mode: 'random',
    control: { entries: [{ type: 'pdf', delaySec: 30 }, { type: 'shipping', delaySec: 300 }] },
    variant: { entries: [{ type: 'shipping', delaySec: 30 }, { type: 'pdf', delaySec: 300 }] },
}

// Migrate old config format (popups[] + firstDelaySec/secondDelaySec) to new entries[]
function migrateConfig(raw: any): PopupABConfig {
    const migrate = (setting: any): PopupSetting => {
        if (setting.entries) return setting // already new format
        const entries: PopupEntry[] = []
        if (setting.popups?.[0]) entries.push({ type: setting.popups[0], delaySec: setting.firstDelaySec ?? 30 })
        if (setting.popups?.[1] && setting.secondDelaySec != null) entries.push({ type: setting.popups[1], delaySec: setting.secondDelaySec })
        return { entries: entries.length > 0 ? entries : [{ type: 'pdf', delaySec: 30 }] }
    }
    return {
        enabled: raw.enabled ?? false,
        mode: raw.mode ?? 'random',
        control: migrate(raw.control),
        variant: migrate(raw.variant),
    }
}

export async function getPopupABConfig(): Promise<PopupABConfig> {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'popup_ab_config')
            .single()

        if (error) {
            if (error.code === 'PGRST116') return DEFAULT_AB_CONFIG
            console.error('Error fetching popup AB config:', error)
            return DEFAULT_AB_CONFIG
        }

        const raw = JSON.parse(data?.value || JSON.stringify(DEFAULT_AB_CONFIG))
        return migrateConfig(raw)
    } catch (error) {
        console.error('Failed to get popup AB config:', error)
        return DEFAULT_AB_CONFIG
    }
}

export async function updatePopupABConfig(config: PopupABConfig) {
    try {
        const { error } = await supabase
            .from('admin_variables')
            .upsert({
                key: 'popup_ab_config',
                value: JSON.stringify(config),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error('Error updating popup AB config:', error)
            throw new Error(error.message)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getPopupABResults() {
    try {
        // Fetch qualify events
        let qualifyLogs: any[] = []
        let qFrom = 0
        const qLimit = 1000
        while (true) {
            const { data, error } = await supabase
                .from('analytics_logs')
                .select('ip_address, metadata, created_at')
                .eq('event_name', 'popup_ab_qualify')
                .range(qFrom, qFrom + qLimit - 1)

            if (error) throw error
            if (!data || data.length === 0) break
            qualifyLogs = [...qualifyLogs, ...data]
            if (data.length < qLimit) break
            qFrom += qLimit
        }

        // Fetch convert events
        let convertLogs: any[] = []
        let cFrom = 0
        const cLimit = 1000
        while (true) {
            const { data, error } = await supabase
                .from('analytics_logs')
                .select('ip_address, metadata, created_at')
                .eq('event_name', 'popup_ab_convert')
                .range(cFrom, cFrom + cLimit - 1)

            if (error) throw error
            if (!data || data.length === 0) break
            convertLogs = [...convertLogs, ...data]
            if (data.length < cLimit) break
            cFrom += cLimit
        }

        // Convert IPs to a set for O(1) lookups
        const convertedIpsByBucket: Record<string, Set<string>> = { control: new Set(), variant: new Set() }
        for (const l of convertLogs) {
            const b = l.metadata?.bucket
            if (b && convertedIpsByBucket[b]) convertedIpsByBucket[b].add(l.ip_address)
        }

        // Build sessions list (dedupe by IP+bucket, keep earliest qualify event)
        const sessionMap = new Map<string, any>()
        for (const l of qualifyLogs) {
            const bucket = l.metadata?.bucket || 'control'
            const key = `${l.ip_address}__${bucket}`
            if (!sessionMap.has(key) || new Date(l.created_at) < new Date(sessionMap.get(key).created_at)) {
                sessionMap.set(key, { ...l, bucket })
            }
        }

        // Compute time-on-site per session by querying events within a 1-hour window
        const sessionsList = Array.from(sessionMap.values())
        const sessions = []

        for (const l of sessionsList) {
            const qualifyTime = new Date(l.created_at)
            // Session window: 30 min before qualify (to capture initial page_view) to 1 hour after
            const windowStart = new Date(qualifyTime.getTime() - 30 * 60 * 1000).toISOString()
            const windowEnd = new Date(qualifyTime.getTime() + 60 * 60 * 1000).toISOString()

            const { data: events } = await supabase
                .from('analytics_logs')
                .select('created_at')
                .eq('ip_address', l.ip_address)
                .gte('created_at', windowStart)
                .lte('created_at', windowEnd)
                .order('created_at', { ascending: true })

            let timeOnSiteSec = 10 // minimum since they qualified
            if (events && events.length >= 2) {
                const first = new Date(events[0].created_at).getTime()
                const last = new Date(events[events.length - 1].created_at).getTime()
                const diff = Math.round((last - first) / 1000)
                if (diff > timeOnSiteSec) timeOnSiteSec = diff
            }

            sessions.push({
                date: l.created_at,
                ip: l.ip_address,
                bucket: l.bucket,
                timeOnSiteSec,
                converted: convertedIpsByBucket[l.bucket]?.has(l.ip_address) || false,
            })
        }

        sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // Build aggregate summary
        const buckets = ['control', 'variant']
        const summary = buckets.map(bucket => {
            const bucketQualify = qualifyLogs.filter((l: any) => l.metadata?.bucket === bucket)
            const uniqueQualifiedIps = new Set(bucketQualify.map((l: any) => l.ip_address))
            const qualified = uniqueQualifiedIps.size
            const conversions = convertedIpsByBucket[bucket].size

            return {
                variant: bucket,
                qualified,
                conversions,
                conversionRate: qualified > 0 ? (conversions / qualified) * 100 : 0,
            }
        })

        return { summary, sessions }
    } catch (error) {
        console.error('Failed to get popup AB results:', error)
        return { summary: [], sessions: [] }
    }
}

// ─── Journey Engine Types ───

export type JourneyProduct = {
    id: string;              // "reservation", "solo", "full", "signature", "reserve50"
    label?: string;          // Override display name, e.g. "DreamPlay One — Sale"
    price: string;           // Displayed price: "$599", "$99", "$1,099"
    originalPrice?: string;  // Strikethrough price: "$1,099"
    badge?: string;          // Override badge: "Most Popular", "Limited Time"
    discountCode?: string;   // Auto-applied at Shopify checkout
    variantId?: string;       // Shopify variant ID override for checkout URL
};

export type JourneyPopup = {
    type: string;           // "shipping", "pdf", "discount", "discount_44", "accessory_25"
    delaySeconds: number;   // seconds after page load to show this popup
};

export type JourneyConfig = {
    id: string;          // e.g., "journey_a" — also used as the ?journey= URL param for ads
    name: string;        // e.g., "High Ticket Premium"
    weight: number;      // Traffic percentage (e.g., 50)
    homepage: string;    // e.g., "/premium-offer"
    checkout: string;    // e.g., "/customize"
    popups: JourneyPopup[]; // Ordered list of popups with timing (up to 10)
    products: JourneyProduct[]; // Which products to show + at what price
    announcementText?: string;  // Text shown in gold top banner (omit to hide)
    priceTier?: string;         // "standard" = served to bots only (SEO protection)
};

export async function getJourneyConfigs(): Promise<JourneyConfig[]> {
    try {
        const { data, error } = await supabase
            .from('admin_variables')
            .select('value')
            .eq('key', 'journey_configs')
            .single();

        if (error) {
            if (error.code === 'PGRST116') return [];
            console.error('Error fetching journey configs:', error);
            return [];
        }

        return JSON.parse(data?.value || '[]');
    } catch (error) {
        console.error('Failed to get journey configs:', error);
        return [];
    }
}

export async function getJourneyById(journeyId: string): Promise<JourneyConfig | null> {
    const configs = await getJourneyConfigs();
    return configs.find(j => j.id === journeyId) || null;
}

export async function updateJourneyConfigs(journeys: JourneyConfig[]) {
    try {
        const { error } = await supabase.from('admin_variables').upsert({
            key: 'journey_configs',
            value: JSON.stringify(journeys),
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error('Error updating journey configs:', error);
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

