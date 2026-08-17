// lib/stripe/checkout.ts
//
// Replaces lib/flutterwave/checkout.ts. Same reduced-liability principle
// as before: hosted Checkout, customer redirected to Stripe's own
// payment page, raw card data never touches this application.
//
// Uses price_data (built inline, at request time) rather than a
// pre-created Stripe Price ID. With 113 tools, each priced differently
// per visitor's localized currency via the already-working
// lib/pricing/localizePrice.ts, pre-creating a fixed Price object per
// tool per currency isn't workable, pricing here is dynamic by design,
// so the price gets built fresh on every checkout instead.

import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null

interface InitiateCheckoutInput {
  amount:      number   // in the currency below, already the final, localized, discounted amount if applicable
  currency:    string
  email:       string
  name:        string
  txRef:       string   // unique reference, this is the idempotency key threaded through the whole flow
  redirectUrl: string   // where the customer's browser goes after payment
  meta?:       Record<string, any>
}

interface CheckoutResult {
  success: boolean
  paymentLink?: string
  error?: string
}

// Stripe requires amounts in the currency's smallest unit (cents for
// USD, sen for MYR, etc.), not a small handful of currencies (JPY, KRW,
// VND, and a few others in the real country list) which are already
// zero-decimal, no smallest-unit conversion needed for those, sending
// them multiplied by 100 would overcharge by 100x. Matches Stripe's own
// documented zero-decimal currency list.
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG',
  'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
])

function toStripeAmount(amount: number, currency: string): number {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
  return isZeroDecimal ? Math.round(amount) : Math.round(amount * 100)
}

export async function initiateCheckout(input: InitiateCheckoutInput): Promise<CheckoutResult> {
  if (!stripe) return { success: false, error: 'STRIPE_SECRET_KEY not configured' }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: input.txRef, // the primary key the webhook uses to find this checkout's pending_checkouts row
      // Omitted entirely, not sent as an empty string, when input.email
      // is blank, which it now genuinely is for every guest, the
      // purchase page's own email field was removed. An empty string
      // sent to Stripe as customer_email would likely be rejected as an
      // invalid address outright, omitting the key lets Stripe correctly
      // treat it as "not provided" and ask for one on its own page
      // instead, exactly the intended fallback.
      ...(input.email ? { customer_email: input.email } : {}),
      // {CHECKOUT_SESSION_ID} is a literal placeholder Stripe itself
      // substitutes with the real session id on redirect, not a template
      // var of ours. Without it, verifyTransaction() below would have no
      // real session id to retrieve, only our own tx_ref, which isn't
      // the identifier that function needs.
      success_url: `${input.redirectUrl}?session_id={CHECKOUT_SESSION_ID}&tx_ref=${encodeURIComponent(input.txRef)}&status=success`,
      cancel_url:  `${input.redirectUrl}?tx_ref=${encodeURIComponent(input.txRef)}&status=cancelled`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: toStripeAmount(input.amount, input.currency),
          product_data: {
            name: input.meta?.tool_name || 'KAYAL Reading',
          },
        },
      }],
      metadata: {
        tx_ref: input.txRef, // duplicated into metadata too, belt-and-suspenders alongside client_reference_id
        customer_name: input.name,
        ...(input.meta || {}),
      },
    })

    if (!session.url) {
      return { success: false, error: 'No payment link returned' }
    }

    return { success: true, paymentLink: session.url }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown checkout error' }
  }
}

// Server-side verification of a specific checkout session, called from
// the return/callback route as a fast best-effort check for showing the
// customer the right screen. This is NOT what fulfills the order, the
// webhook is, exactly the same division of responsibility as the
// Flutterwave version this replaces, verification here is purely for
// the customer's immediate experience, never for crediting anything or
// generating a reading.
export async function verifyTransaction(sessionId: string): Promise<{ status: string; txRef: string | null }> {
  if (!stripe) return { status: 'unknown', txRef: null }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return {
      status: session.payment_status === 'paid' ? 'successful' : session.payment_status,
      txRef:  session.client_reference_id ?? null,
    }
  } catch {
    return { status: 'unknown', txRef: null }
  }
}
