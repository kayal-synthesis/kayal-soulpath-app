import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
})

export class PaymentService {
  async createCheckoutSession(toolId: string, userId: string, email: string) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: toolId,
            },
            unit_amount: 4700, // $47
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.APP_URL}/report/${toolId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/purchase/${toolId}?canceled=true`,
      customer_email: email,
      metadata: {
        userId,
        toolId
      }
    })

    return session
  }

  async createSubscription(priceId: string, userId: string, email: string) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing?canceled=true`,
      customer_email: email,
      metadata: {
        userId
      }
    })

    return session
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        await this.handleSuccessfulPayment(session)
        break
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice
        await this.handleSuccessfulSubscription(invoice)
        break
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription
        await this.handleCancelledSubscription(subscription)
        break
    }
  }

  private async handleSuccessfulPayment(session: Stripe.Checkout.Session) {
    const { userId, toolId } = session.metadata || {}
    // Update user's purchased tools in database
    console.log(`User ${userId} purchased ${toolId}`)
  }

  private async handleSuccessfulSubscription(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string
    // Activate subscription for user
    console.log(`Subscription activated for ${customerId}`)
  }

  private async handleCancelledSubscription(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string
    // Deactivate subscription for user
    console.log(`Subscription cancelled for ${customerId}`)
  }
}