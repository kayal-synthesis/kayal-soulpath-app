// lib/flutterwave/payouts.ts
//
// Built around Flutterwave's v4 "General Transfer Flow" specifically, not
// the v3 Bulk Transfer endpoint, because nothing in Flutterwave's own
// documented Bulk payload shows support for a recipient reference, only
// raw account_number/bank_code per entry. Using Bulk would mean either
// storing raw banking details after all (defeating the whole point of the
// v4 flow) or silently losing the reduced-liability benefit for the batch
// path specifically. Both the instant first-payout trigger and the
// monthly batch use individual v4 transfers in a loop instead. At
// realistic affiliate volume this costs nothing meaningful. If volume
// ever grows large enough for that to matter, that is the moment to
// confirm directly with Flutterwave whether Bulk supports recipient
// references, not before.

const FLW_API_BASE = process.env.FLUTTERWAVE_ENV === 'production'
  ? 'https://api.flutterwave.com'
  : 'https://developersandbox-api.flutterwave.com'

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY

interface CreateRecipientInput {
  accountBank:   string  // bank code, or mobile money identifier like 'MPS', 'MTN'
  accountNumber: string  // account number, or phone number for mobile money
  currency:      string  // NGN, KES, GHS, etc, the affiliate's real payout currency
}

interface RecipientResult {
  recipientId: string
  bankName:    string | null
  last4:       string
}

// Called once, when an affiliate submits their banking details. The raw
// account number goes out in this one request and nothing else. Critically,
// Flutterwave's own recipient-creation response echoes the full account
// number back (data.details.account_number), so this function destructures
// only the three specific fields it actually needs, id, bank.name, and a
// last-4 derived from our own input, never from the echoed response, and
// never logs or stores the response object as a whole. Storing that
// whole object would leak the exact thing this architecture exists to
// avoid storing.
export async function createPayoutRecipient(input: CreateRecipientInput): Promise<RecipientResult> {
  if (!FLW_SECRET_KEY) throw new Error('FLUTTERWAVE_SECRET_KEY not configured')

  const response = await fetch(`${FLW_API_BASE}/reference/transfers_recipients_create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FLW_SECRET_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      account_bank:   input.accountBank,
      account_number: input.accountNumber,
      currency:       input.currency,
    }),
  })

  if (!response.ok) {
    // Deliberately not including the response body in this error, it may
    // contain the echoed account number, and errors often end up in logs.
    throw new Error(`Flutterwave recipient creation failed: ${response.status}`)
  }

  const data = await response.json()

  // Confirmed field paths: data.id (not data.recipient_id), data.bank.name
  // (nested), never data.details.account_number, which is deliberately
  // never read here even though it is present in the real response.
  const recipientId = data?.data?.id
  const bankName     = data?.data?.bank?.name ?? null

  if (!recipientId) {
    throw new Error('Flutterwave recipient creation returned no id')
  }

  return {
    recipientId,
    bankName,
    last4: input.accountNumber.slice(-4), // derived from our own input, never from the echoed response
  }
}

interface TriggerPayoutInput {
  recipientId: string
  amountLocal: number   // already converted to the affiliate's payout currency
  currency:    string
  reference:   string   // must be unique, 6-42 alphanumeric chars, this is the idempotency key
}

interface PayoutResult {
  success: boolean
  transferId?: string
  error?: string
}

// A single transfer execution. Idempotent by design: callers must pass a
// deterministic reference (see buildPayoutReference below) so a retried
// call for the same underlying event never double-pays.
export async function triggerPayout(input: TriggerPayoutInput): Promise<PayoutResult> {
  if (!FLW_SECRET_KEY) throw new Error('FLUTTERWAVE_SECRET_KEY not configured')

  try {
    const response = await fetch(`${FLW_API_BASE}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        recipient: input.recipientId,
        amount:    input.amountLocal,
        currency:  input.currency,
        reference: input.reference,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: `${response.status}: ${data?.message || 'transfer failed'}` }
    }

    return { success: true, transferId: data.data?.id ?? data.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown transfer error' }
  }
}

// Deterministic reference so retries of the same underlying event never
// create a second transfer. "first" for the one-time activation payout,
// a year-month string for the recurring monthly batch, so re-running the
// same month's batch job twice, a real, expected failure-recovery case,
// not a hypothetical, does not pay anyone twice.
export function buildPayoutReference(affiliateUserId: string, kind: 'first' | 'monthly', period?: string): string {
  const base = `payout-${affiliateUserId.slice(0, 8)}-${kind}${period ? `-${period}` : ''}`
  return base.slice(0, 42) // Flutterwave's stated max length
}

// ─────────────────────────────────────────────────────────────
// Currency conversion — pending_payout is tracked in USD throughout the
// commission system already built, converted here to the affiliate's
// real payout currency using Flutterwave's own rates endpoint, so the
// rate matches whatever Flutterwave itself uses at execution.
//
// Endpoint and payload shape confirmed (POST, not GET, source/destination
// object structure). Direction matters and is easy to get backwards: the
// endpoint answers "how much of currency A do I need to end up with
// exactly N units of currency B", not "I have N units of A, what is that
// in B". For this use case, the known amount (pending_payout, USD) is
// the destination, and the local currency being solved for is the
// source, with no amount specified. The answer comes back as
// response.data.source.amount, confirmed against Flutterwave's own
// worked example before writing this.
// ─────────────────────────────────────────────────────────────

export async function convertUsdToLocal(usdAmount: number, targetCurrency: string): Promise<number> {
  if (targetCurrency === 'USD') return usdAmount
  if (!FLW_SECRET_KEY) throw new Error('FLUTTERWAVE_SECRET_KEY not configured')

  const response = await fetch(`${FLW_API_BASE}/transfers/rates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FLW_SECRET_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      source:      { currency: targetCurrency },
      destination: { currency: 'USD', amount: usdAmount },
    }),
  })

  if (!response.ok) {
    throw new Error(`FX rate lookup failed: ${response.status}`)
  }

  const data = await response.json()
  const localAmount = data?.data?.source?.amount

  if (localAmount == null) {
    throw new Error('FX rate lookup returned no source.amount, response shape may not match what was confirmed')
  }

  return Math.round(parseFloat(localAmount) * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// Payout attempt tracking — records every transfer attempt in a pending
// state the moment Flutterwave's API accepts the request. Completion is
// confirmed separately, later, by the webhook handler, never here. This
// function's job ends at "recorded as pending," it never touches
// affiliate_profiles.pending_payout or payout_activated, those only
// change once the real outcome is known.
// ─────────────────────────────────────────────────────────────

interface RecordPayoutInput {
  supabaseAdmin: any // typed as any to avoid a hard dependency on a specific supabase-js version here
  affiliateId:   string
  userId:        string
  reference:     string
  transferId?:   string
  kind:          'first' | 'monthly'
  period?:       string
  amountUsd:     number
  amountLocal:   number
  currency:      string
}

export async function recordPayoutAttempt(input: RecordPayoutInput) {
  await input.supabaseAdmin.from('affiliate_payouts').insert({
    affiliate_id: input.affiliateId,
    user_id:      input.userId,
    reference:    input.reference,
    transfer_id:  input.transferId ?? null,
    kind:         input.kind,
    period:       input.period ?? null,
    amount_usd:   input.amountUsd,
    amount_local: input.amountLocal,
    currency:     input.currency,
    status:       'pending',
    created_at:   new Date().toISOString(),
  })
}

// ─────────────────────────────────────────────────────────────
// Webhook verification — confirmed, and worth being explicit about the
// specific gotcha: Flutterwave sends the plain secret hash in the
// verif-hash header, this is a direct string comparison against the
// secret configured in the Flutterwave dashboard, NOT an HMAC signature
// computed over the payload. Computing an HMAC here, the more common
// pattern with other payment providers, will cause every webhook to fail
// verification. This distinction was confirmed with an explicit warning
// from the source it came from, specifically because it is an easy,
// non-obvious mistake to make by pattern-matching to how other providers
// (Stripe included) do webhook verification.
// ─────────────────────────────────────────────────────────────

export function verifyFlutterwaveWebhook(receivedHash: string | null): boolean {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET
  if (!expected || !receivedHash) return false
  return receivedHash === expected
}
