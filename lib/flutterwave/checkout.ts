// lib/flutterwave/checkout.ts
//
// Initiates a Flutterwave Standard (hosted) checkout session. The
// customer is redirected to Flutterwave's own payment page, never a
// custom card form built here, this is deliberately the simpler,
// lower-liability integration path (no raw card data ever touches this
// application at all), consistent with the same reduced-data-liability
// principle already applied throughout the payout side.
//
// ⚠️  The exact endpoint path and payload shape below follow the same
// general pattern confirmed for transfers and rates (POST to a specific
// resource, Bearer auth, a returned reference to redirect against), but
// were not independently confirmed against Flutterwave's current
// checkout-specific docs the way the transfer and rates endpoints were.
// Verify this specific endpoint against Flutterwave's own current docs
// before this collects a single real payment, this is the one place in
// the whole system that actually takes a customer's money.

const FLW_API_BASE = process.env.FLUTTERWAVE_ENV === 'production'
  ? 'https://api.flutterwave.com'
  : 'https://developersandbox-api.flutterwave.com'
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY
const FLW_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY

interface InitiateCheckoutInput {
  amount:      number   // in the currency below, already the final, localized, discounted amount if applicable
  currency:    string
  email:       string
  name:        string
  txRef:       string   // unique reference, this is the idempotency key threaded through the whole flow
  redirectUrl: string   // where Flutterwave sends the customer's browser back to after payment
  meta?:       Record<string, any>
}

interface CheckoutResult {
  success: boolean
  paymentLink?: string
  error?: string
}

export async function initiateCheckout(input: InitiateCheckoutInput): Promise<CheckoutResult> {
  if (!FLW_SECRET_KEY) return { success: false, error: 'FLUTTERWAVE_SECRET_KEY not configured' }

  try {
    const response = await fetch(`${FLW_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        tx_ref:       input.txRef,
        amount:       input.amount,
        currency:     input.currency,
        redirect_url: input.redirectUrl,
        customer: {
          email: input.email,
          name:  input.name,
        },
        meta: input.meta || {},
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: `${response.status}: ${data?.message || 'checkout initiation failed'}` }
    }

    const paymentLink = data?.data?.link
    if (!paymentLink) {
      return { success: false, error: 'No payment link returned' }
    }

    return { success: true, paymentLink }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown checkout error' }
  }
}

// Server-side verification of a specific transaction, called from the
// return/callback route as a fast best-effort check for showing the
// customer the right screen. This is NOT what fulfills the order, the
// webhook is, verification here is purely for the customer's immediate
// experience (show "success" vs "still processing" vs "failed"), never
// for actually crediting anything or generating a reading.
export async function verifyTransaction(transactionId: string): Promise<{ status: string; txRef: string | null }> {
  if (!FLW_SECRET_KEY) return { status: 'unknown', txRef: null }

  try {
    const response = await fetch(`${FLW_API_BASE}/transactions/${transactionId}/verify`, {
      headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}` },
    })
    if (!response.ok) return { status: 'unknown', txRef: null }
    const data = await response.json()
    return {
      status: data?.data?.status ?? 'unknown',
      txRef:  data?.data?.tx_ref ?? null,
    }
  } catch {
    return { status: 'unknown', txRef: null }
  }
}
