#!/usr/bin/env tsx
/**
 * verify-preorder-logic.ts
 * Local verification of preorder parsing and primary-order selection logic.
 * No Supabase connection required — reads the CSV directly.
 *
 * Usage:
 *   npx tsx scripts/verify-preorder-logic.ts
 *
 * Checks:
 *   1. derivePaymentType correctness across all 56 rows
 *   2. parseProductMeta spot checks
 *   3. Primary preorder selection for known duplicate-email cases
 *   4. Pro-only finish gate: Aztec Gold and Nightmare Black → product_line=pro
 */

import * as fs from 'fs'
import * as path from 'path'
import {
    derivePaymentType,
    parseProductMeta,
    paymentTypePriority,
    type PaymentType,
    type PreorderOrder,
    PAYMENT_TYPE_LABELS,
} from '../src/lib/preorders'

// ── CSV helpers ────────────────────────────────────────────────────────────

const CSV_PATH = path.resolve(
    __dirname,
    '../../data/dreamplay/orders/2026-04-16-orders-normalized.csv'
)

function parseCSV(content: string): Record<string, string>[] {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim())
    return lines.slice(1).map((line) => {
        const values = line.split(',')
        return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
    })
}

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

// ── Primary selection (mirrors getPreorderByEmail sort logic) ──────────────

function selectPrimary(orders: Pick<PreorderOrder, 'payment_type' | 'created_at' | 'order_name'>[]): typeof orders[0] {
    return [...orders].sort((a, b) => {
        const rankDiff = paymentTypePriority(a.payment_type) - paymentTypePriority(b.payment_type)
        if (rankDiff !== 0) return rankDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })[0]
}

// ── Test runner ────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function expect<T>(label: string, actual: T, expected: T) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    if (ok) {
        console.log(`  ✓ ${label}`)
        passed++
    } else {
        console.error(`  ✗ ${label}`)
        console.error(`    expected: ${JSON.stringify(expected)}`)
        console.error(`    actual:   ${JSON.stringify(actual)}`)
        failed++
    }
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`ERROR: CSV not found at ${CSV_PATH}`)
        process.exit(1)
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8')
    const rows = parseCSV(content)
    console.log(`\nLoaded ${rows.length} rows from CSV\n`)

    // ── 1. derivePaymentType ──────────────────────────────────────────────

    console.log('── 1. derivePaymentType ──')

    expect(
        '50% Reservation → deposit_50',
        derivePaymentType('DreamPlay Piano Bundle - 50% Reservation - DS5.5 / White'),
        'deposit_50'
    )
    expect(
        'DreamPlay One 50% Reservation → deposit_50',
        derivePaymentType('DreamPlay One 50% Reservation'),
        'deposit_50'
    )
    expect(
        'Waitlist Reservation → waitlist_reservation',
        derivePaymentType('DreamPlay Waitlist Reservation'),
        'waitlist_reservation'
    )
    expect(
        'Piano Bundle (full) → full_payment',
        derivePaymentType('DreamPlay Piano Bundle - DS5.5 / Black'),
        'full_payment'
    )
    expect(
        'Keyboard Only → full_payment',
        derivePaymentType('DreamPlay One Keyboard Only'),
        'full_payment'
    )
    expect(
        'Pro Keyboard → full_payment',
        derivePaymentType('DreamPlay One Pro Keyboard - DS5.5 / Black'),
        'full_payment'
    )

    // Check all 56 rows classify without error
    const paymentTypeCounts: Record<string, number> = {}
    for (const row of rows) {
        const pt = derivePaymentType(row['lineitem_name'] ?? '')
        paymentTypeCounts[pt] = (paymentTypeCounts[pt] ?? 0) + 1
    }
    console.log('\n  Payment type distribution across all rows:')
    for (const [type, count] of Object.entries(paymentTypeCounts)) {
        console.log(`    ${type}: ${count}  (${PAYMENT_TYPE_LABELS[type as PaymentType] ?? type})`)
    }
    // Verify summary matches known totals: 45 full_payment, 5 deposit_50, 6 waitlist_reservation
    expect('full_payment count = 45', paymentTypeCounts['full_payment'], 45)
    expect('deposit_50 count = 5', paymentTypeCounts['deposit_50'], 5)
    expect('waitlist_reservation count = 6', paymentTypeCounts['waitlist_reservation'], 6)

    // ── 2. parseProductMeta ───────────────────────────────────────────────

    console.log('\n── 2. parseProductMeta ──')

    const piano_bundle = parseProductMeta('DreamPlay Piano Bundle - DS5.5 / Black')
    expect('Piano Bundle → product_line=bundle', piano_bundle.product_line, 'bundle')
    expect('Piano Bundle → size_variant=DS5.5', piano_bundle.size_variant, 'DS5.5')
    expect('Piano Bundle → finish=Black', piano_bundle.finish, 'Black')

    const midnight_bundle = parseProductMeta('DreamPlay Piano Bundle (MLK Holiday Sale) - DS5.5 / Midnight Black')
    expect('Midnight Black bundle → finish=Midnight Black', midnight_bundle.finish, 'Midnight Black')

    const pro_keyboard = parseProductMeta('DreamPlay One Pro Keyboard - DS5.5 / Black')
    expect('Pro Keyboard → product_line=pro', pro_keyboard.product_line, 'pro')
    expect('Pro Keyboard → size_variant=DS5.5', pro_keyboard.size_variant, 'DS5.5')

    const keyboard_only = parseProductMeta('DreamPlay One Keyboard Only')
    expect('Keyboard Only → product_line=keyboard_only', keyboard_only.product_line, 'keyboard_only')
    expect('Keyboard Only → size_variant=null', keyboard_only.size_variant, null)
    expect('Keyboard Only → finish=null', keyboard_only.finish, null)

    const aztec_gold = parseProductMeta('DreamPlay One Pro - Aztec Gold / DS6.0')
    expect('Aztec Gold → product_line=pro', aztec_gold.product_line, 'pro')
    expect('Aztec Gold → finish=Aztec Gold', aztec_gold.finish, 'Aztec Gold')

    const white_bundle = parseProductMeta('DreamPlay Piano Bundle - DS6.0 / White')
    expect('White bundle → finish=White', white_bundle.finish, 'White')

    // Pro-only finish gate: Aztec Gold and Nightmare Black must map to product_line=pro
    // (these finishes only appear in lineitem names that also contain "Pro")
    const nightmare = parseProductMeta('DreamPlay One Pro Keyboard - Nightmare Black')
    expect('Nightmare Black in Pro name → product_line=pro', nightmare.product_line, 'pro')
    expect('Nightmare Black → finish=Nightmare Black', nightmare.finish, 'Nightmare Black')

    // ── 3. Primary preorder selection for duplicate-email cases ───────────

    console.log('\n── 3. Primary preorder selection (duplicate emails) ──')

    // Build a minimal order map from CSV
    const ordersByEmail: Record<string, Array<{ order_name: string; payment_type: PaymentType; created_at: string }>> = {}
    for (const row of rows) {
        const email = (row['email'] ?? '').toLowerCase().trim()
        const pt = derivePaymentType(row['lineitem_name'] ?? '')
        const created_at = parseCsvDate(row['created_at'] ?? '')
        if (!ordersByEmail[email]) ordersByEmail[email] = []
        ordersByEmail[email].push({ order_name: row['order_name'] ?? '', payment_type: pt, created_at })
    }

    // Known duplicate cases from spec:
    // joe@joezeng.com: #1081 full_payment, #1055 waitlist_reservation → #1081 wins
    const joeOrders = ordersByEmail['joe@joezeng.com'] ?? []
    const joePrimary = selectPrimary(joeOrders)
    expect('joe@joezeng.com primary = #1081 (full_payment wins over waitlist)', joePrimary.order_name, '#1081')

    // mcai.a.lorete@gmail.com: #1082 full_payment, #1053 waitlist_reservation → #1082 wins
    const loreteOrders = ordersByEmail['mcai.a.lorete@gmail.com'] ?? []
    const loretePrimary = selectPrimary(loreteOrders)
    expect('mcai.a.lorete@gmail.com primary = #1082 (full_payment wins over waitlist)', loretePrimary.order_name, '#1082')

    // waowao0158@gmail.com: #1051 full_payment, #1046 waitlist_reservation → #1051 wins
    const waoOrders = ordersByEmail['waowao0158@gmail.com'] ?? []
    const waoPrimary = selectPrimary(waoOrders)
    expect('waowao0158@gmail.com primary = #1051 (full_payment wins over waitlist)', waoPrimary.order_name, '#1051')

    // ── 4. Deduplicated email count ───────────────────────────────────────

    console.log('\n── 4. Dataset summary ──')
    const uniqueEmails = Object.keys(ordersByEmail)
    const duplicateEmails = uniqueEmails.filter((e) => (ordersByEmail[e]?.length ?? 0) > 1)
    console.log(`  Total rows: ${rows.length}`)
    console.log(`  Unique buyer emails: ${uniqueEmails.length}`)
    console.log(`  Emails with multiple orders: ${duplicateEmails.length}`)
    if (duplicateEmails.length > 0) {
        for (const email of duplicateEmails) {
            const orders = ordersByEmail[email] ?? []
            const primary = selectPrimary(orders)
            console.log(`    ${email}: ${orders.map((o) => o.order_name + '/' + o.payment_type).join(', ')} → primary: ${primary.order_name}`)
        }
    }

    // ── Result ────────────────────────────────────────────────────────────

    console.log(`\n──────────────────────────`)
    console.log(`Results: ${passed} passed, ${failed} failed`)
    if (failed > 0) {
        process.exit(1)
    } else {
        console.log('All checks passed.')
    }
}

main()
