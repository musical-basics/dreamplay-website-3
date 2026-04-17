#!/usr/bin/env tsx
/**
 * import-preorders.ts
 * Imports the canonical local order snapshot into the Supabase preorder_orders table.
 *
 * Prerequisites:
 *   - Run supabase/migrations/20260416000000_create_preorder_orders.sql first.
 *   - Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx scripts/import-preorders.ts
 *
 *   Or with explicit env vars:
 *   NEXT_PUBLIC_SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-preorders.ts
 *
 * This script is idempotent — it upserts on (order_name, import_batch_id).
 * Re-running it will update existing rows but not create duplicates.
 *
 * Source file:
 *   /home/openclaw/.openclaw/workspace/data/dreamplay/orders/2026-04-16-orders-normalized.csv
 * (also accessible as ../../data/dreamplay/orders/... relative to this script)
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { derivePaymentType, parseProductMeta } from '../src/lib/preorders'

// ── Config ─────────────────────────────────────────────────────────────────

const IMPORT_BATCH_ID = '2026-04-16'
const SOURCE = 'shopify-csv'

// Default path assumes this script lives at dreamplay-website-3/scripts/
// and the data directory is at workspace/data/
const DEFAULT_CSV_PATH = path.resolve(
    __dirname,
    '../../data/dreamplay/orders/2026-04-16-orders-normalized.csv'
)

// ── CSV parsing ────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim())
    return lines.slice(1).map((line) => {
        // Simple split — our CSV has no quoted commas, so this is safe
        const values = line.split(',')
        return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
    })
}

/**
 * Parses the normalized CSV date format "M/D/YY H:mm" into an ISO string.
 * Examples: "4/15/26 10:18" → 2026-04-15T10:18:00.000Z (UTC)
 */
function parseCsvDate(s: string): string {
    const parts = s.trim().split(' ')
    const datePart = parts[0] ?? ''
    const timePart = parts[1] ?? '0:0'
    const [monthStr, dayStr, yearStr] = datePart.split('/')
    const year = parseInt(yearStr ?? '26')
    const fullYear = year < 100 ? 2000 + year : year
    const month = parseInt(monthStr ?? '1')
    const day = parseInt(dayStr ?? '1')
    const [h, m] = timePart.split(':').map(Number)
    return new Date(Date.UTC(fullYear, month - 1, day, h ?? 0, m ?? 0)).toISOString()
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
        console.error(
            'ERROR: Missing environment variables.\n' +
                'Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
                'Usage: npx dotenv -e .env.local -- tsx scripts/import-preorders.ts'
        )
        process.exit(1)
    }

    const csvPath = process.env.ORDERS_CSV_PATH ?? DEFAULT_CSV_PATH

    if (!fs.existsSync(csvPath)) {
        console.error(`ERROR: CSV file not found at: ${csvPath}`)
        console.error('Set ORDERS_CSV_PATH to override the default location.')
        process.exit(1)
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })

    console.log(`Reading CSV: ${csvPath}`)
    const content = fs.readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(content)
    console.log(`Parsed ${rows.length} rows`)

    const records = rows.map((row) => {
        const lineitemName = row['lineitem_name'] ?? ''
        // Derive payment_type from lineitem_name (NOT from CSV payment_type column)
        const paymentType = derivePaymentType(lineitemName)
        const { product_line, size_variant, finish } = parseProductMeta(lineitemName)

        return {
            order_name: row['order_name'] ?? '',
            raw_shopify_id: row['raw_shopify_id'] || null,
            import_batch_id: IMPORT_BATCH_ID,
            source: SOURCE,
            email: (row['email'] ?? '').toLowerCase().trim(),
            customer_name: row['customer_name'] || null,
            created_at: parseCsvDate(row['created_at'] ?? ''),
            financial_status: row['financial_status'] || null,
            fulfillment_status: row['fulfillment_status'] || null,
            total_paid_usd: row['total_paid_usd'] ? parseFloat(row['total_paid_usd']) : null,
            payment_type: paymentType,
            is_reservation: row['is_reservation']?.toLowerCase() === 'true',
            lineitem_name: lineitemName || null,
            product_line,
            size_variant,
            finish,
        }
    })

    // Validate before insert
    const invalid = records.filter((r) => !r.order_name || !r.email)
    if (invalid.length > 0) {
        console.error(`ERROR: ${invalid.length} rows have missing order_name or email. Aborting.`)
        process.exit(1)
    }

    console.log(`Upserting ${records.length} records into preorder_orders...`)

    const { data, error } = await supabase
        .from('preorder_orders')
        .upsert(records, { onConflict: 'order_name,import_batch_id' })
        .select('id, order_name, email, payment_type')

    if (error) {
        console.error('Import failed:', error.message)
        if (error.details) console.error('Details:', error.details)
        process.exit(1)
    }

    console.log(`\nImport complete. ${data?.length ?? 0} records upserted.`)

    // Print payment type summary
    const summary: Record<string, number> = {}
    for (const r of records) {
        summary[r.payment_type] = (summary[r.payment_type] ?? 0) + 1
    }
    console.log('\nPayment type breakdown:')
    for (const [type, count] of Object.entries(summary)) {
        console.log(`  ${type}: ${count}`)
    }
}

main().catch((err) => {
    console.error('Unexpected error:', err)
    process.exit(1)
})
