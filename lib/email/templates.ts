/**
 * KAYAL LifeOS — Email Templates
 *
 * All transactional emails for the purchase flow.
 * Render as HTML strings — works with Resend, SendGrid, Nodemailer, etc.
 *
 * Usage:
 *   import { templates } from '@/lib/email/templates'
 *   const html = templates.purchaseConfirmation({ ... })
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kayalsoulpath.com'
const SUPPORT_EMAIL = 'support@kayalsoulpath.com'

const style = {
  body:    'font-family: Georgia, serif; background: #faf8f3; margin: 0; padding: 0;',
  wrap:    'max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e8e0d0;',
  header:  'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center;',
  logo:    'font-family: Georgia, serif; font-size: 24px; color: #c9a84c; letter-spacing: 4px; margin: 0;',
  sub:     'font-size: 11px; color: rgba(201,168,76,0.7); letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;',
  body_p:  'padding: 32px 40px;',
  h1:      'font-family: Georgia, serif; font-size: 26px; color: #1a1a2e; margin: 0 0 16px;',
  p:       'font-size: 15px; color: #444; line-height: 1.8; margin: 0 0 16px;',
  card:    'background: #faf8f3; border: 1px solid #e8e0d0; border-radius: 8px; padding: 20px 24px; margin: 20px 0;',
  btn:     'display: inline-block; background: linear-gradient(135deg, #9a7a2e, #c9a84c); color: #1a1a2e; text-decoration: none; font-family: Georgia, serif; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; padding: 14px 32px; border-radius: 4px; font-weight: bold;',
  btnWrap: 'text-align: center; margin: 28px 0;',
  divider: 'border: none; border-top: 1px solid #e8e0d0; margin: 24px 0;',
  small:   'font-size: 12px; color: #888; line-height: 1.7;',
  footer:  'background: #1a1a2e; padding: 24px 40px; text-align: center;',
  ftxt:    'font-size: 12px; color: rgba(247,242,232,0.5); line-height: 1.8;',
  flink:   'color: #c9a84c; text-decoration: none;',
  gold:    'color: #c9a84c;',
  green:   'color: #16a34a; font-weight: bold;',
}

function wrap(body: string, preview: string = ''): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${preview ? `<meta name="description" content="${preview}">` : ''}
<title>KAYAL LifeOS</title>
</head><body style="${style.body}">
<div style="${style.wrap}">
  <div style="${style.header}">
    <p style="${style.logo}">KAYAL</p>
    <p style="${style.sub}">LifeOS · Soul Blueprint Science</p>
  </div>
  ${body}
  <div style="${style.footer}">
    <p style="${style.ftxt}">
      KAYAL LifeOS &nbsp;·&nbsp;
      <a href="${BASE_URL}/member/dashboard" style="${style.flink}">Dashboard</a> &nbsp;·&nbsp;
      <a href="mailto:${SUPPORT_EMAIL}" style="${style.flink}">Support</a> &nbsp;·&nbsp;
      <a href="${BASE_URL}/unsubscribe" style="${style.flink}">Unsubscribe</a>
    </p>
    <p style="${style.ftxt}">© ${new Date().getFullYear()} KAYAL SoulPath Institute. All rights reserved.</p>
  </div>
</div>
</body></html>`
}

function orderRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#666;border-bottom:1px solid #e8e0d0;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:#1a1a2e;text-align:right;border-bottom:1px solid #e8e0d0;">${value}</td>
  </tr>`
}

// ─────────────────────────────────────────────────────────────
// 1. PURCHASE CONFIRMATION  (sent immediately after payment)
// ─────────────────────────────────────────────────────────────
export function purchaseConfirmation(opts: {
  firstName: string
  toolName: string
  toolEmoji: string
  price: number
  jobId: string | null
  requiresImages: boolean
  imageType?: string
  isGuest: boolean
  dashboardUrl?: string
}) {
  const {
    firstName, toolName, toolEmoji, price, jobId,
    requiresImages, imageType, isGuest, dashboardUrl,
  } = opts

  const nextStep = requiresImages
    ? `Before we can start your reading, we need your <strong>${imageType}</strong>. You were taken back to the app to upload them — if you missed this step, simply log in and visit <em>My Purchases</em>.`
    : `Your reading is now in the queue and will be ready shortly. We'll send you another email the moment it's done.`

  const dashLink = dashboardUrl || `${BASE_URL}/member/dashboard${jobId ? `?pending=${jobId}` : ''}`

  return wrap(`
    <div style="${style.body_p}">
      <h1 style="${style.h1}">✨ Payment Confirmed, ${firstName}!</h1>
      <p style="${style.p}">Thank you for purchasing <strong>${toolEmoji} ${toolName}</strong>. Your order has been received and confirmed.</p>

      <div style="${style.card}">
        <table style="width:100%;border-collapse:collapse;">
          ${orderRow('Tool', `${toolEmoji} ${toolName}`)}
          ${orderRow('Amount paid', `$${price.toFixed(2)}`)}
          ${jobId ? orderRow('Reference', `#${jobId.slice(0, 8).toUpperCase()}`) : ''}
          ${orderRow('Status', '<span style="color:#16a34a;font-weight:bold;">✓ Confirmed</span>')}
        </table>
      </div>

      <p style="${style.p}"><strong>What happens next?</strong><br>${nextStep}</p>

      ${!isGuest ? `
      <div style="${style.btnWrap}">
        <a href="${dashLink}" style="${style.btn}">Go to My Dashboard →</a>
      </div>
      <p style="${style.p}" align="center">
        <small>Or log in at <a href="${BASE_URL}/auth/login" style="color:#c9a84c;">${BASE_URL}/auth/login</a></small>
      </p>
      ` : `
      <div style="${style.card}">
        <p style="margin:0;font-size:14px;color:#444;"><strong style="color:#c9a84c;">Want to save your reading?</strong><br>
        Create a free account to access your dashboard, view your reading anytime, and receive personalised insights.
        <a href="${BASE_URL}/auth/signup" style="color:#c9a84c;display:block;margin-top:8px;font-weight:bold;">Create your free account →</a></p>
      </div>
      `}

      <hr style="${style.divider}">
      <p style="${style.small}">If you have any questions about your order, reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#c9a84c;">${SUPPORT_EMAIL}</a>.<br>
      Reference number: ${jobId ? `#${jobId.slice(0, 8).toUpperCase()}` : 'N/A'}</p>
    </div>
  `, `Payment confirmed — your ${toolName} is being prepared`)
}

// ─────────────────────────────────────────────────────────────
// 2. READING READY  (sent by backend when job completes)
// ─────────────────────────────────────────────────────────────
export function readingReady(opts: {
  firstName: string
  toolName: string
  toolEmoji: string
  jobId: string
  isGuest: boolean
  guestAccessUrl?: string   // time-limited URL for guests
  relatedTools?: { name: string; emoji: string; price: number; id: string }[]
}) {
  const { firstName, toolName, toolEmoji, jobId, isGuest, guestAccessUrl, relatedTools = [] } = opts
  const accessUrl = isGuest
    ? (guestAccessUrl || `${BASE_URL}/guest/reading/${jobId}`)
    : `${BASE_URL}/member/dashboard?open=${jobId}`

  return wrap(`
    <div style="${style.body_p}">
      <h1 style="${style.h1}">🌟 Your Reading is Ready, ${firstName}!</h1>
      <p style="${style.p}">Your <strong>${toolEmoji} ${toolName}</strong> has been completed and is waiting for you.</p>

      <div style="${style.btnWrap}">
        <a href="${accessUrl}" style="${style.btn}">View My Reading →</a>
      </div>

      ${isGuest ? `
      <div style="${style.card}">
        <p style="margin:0;font-size:14px;color:#444;">
          <strong>💡 Tip:</strong> You're viewing as a guest. Create a free account to:
        </p>
        <ul style="font-size:14px;color:#444;line-height:2;margin:8px 0 0;padding-left:20px;">
          <li>Save your reading permanently</li>
          <li>Access it anytime from any device</li>
          <li>Receive personalised follow-up insights</li>
          <li>Get member-only discounts</li>
        </ul>
        <a href="${BASE_URL}/auth/signup" style="color:#c9a84c;font-weight:bold;font-size:14px;display:block;margin-top:12px;">Create your free account →</a>
      </div>
      ` : `
      <div style="${style.card}">
        <p style="margin:0;font-size:13px;color:#666;">
          Log in to your dashboard at any time: <a href="${BASE_URL}/member/dashboard" style="color:#c9a84c;">${BASE_URL}/member/dashboard</a>
        </p>
      </div>
      `}

      ${relatedTools.length > 0 ? `
      <hr style="${style.divider}">
      <p style="font-family:Georgia,serif;font-size:16px;color:#1a1a2e;margin-bottom:16px;">
        <strong>Continue Your Soul Blueprint Journey</strong>
      </p>
      <p style="${style.small}">Based on ${toolName}, you may find these valuable:</p>
      ${relatedTools.map(t => `
        <div style="border:1px solid #e8e0d0;border-radius:6px;padding:16px;margin-bottom:12px;display:flex;gap:12px;">
          <span style="font-size:28px;">${t.emoji}</span>
          <div>
            <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#1a1a2e;">${t.name}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#888;">from $${t.price}</p>
            <a href="${BASE_URL}/purchase/${t.id}" style="color:#c9a84c;font-size:13px;font-weight:bold;">Get this reading →</a>
          </div>
        </div>`).join('')}
      ` : ''}
    </div>
  `, `Your ${toolName} reading is ready to view`)
}

// ─────────────────────────────────────────────────────────────
// 3. WELCOME + LOGIN INSTRUCTIONS  (after account creation)
// ─────────────────────────────────────────────────────────────
export function welcomeAndLogin(opts: {
  firstName: string
  email: string
  toolName: string
  toolEmoji: string
  jobId: string | null
}) {
  const { firstName, email, toolName, toolEmoji, jobId } = opts
  const dashUrl = `${BASE_URL}/member/dashboard${jobId ? `?pending=${jobId}` : ''}`
  const loginUrl = `${BASE_URL}/auth/login`

  return wrap(`
    <div style="${style.body_p}">
      <h1 style="${style.h1}">Welcome to KAYAL, ${firstName}! 🌙</h1>
      <p style="${style.p}">Your account has been created and your purchase of <strong>${toolEmoji} ${toolName}</strong> has been saved to your profile.</p>

      <div style="${style.card}">
        <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#1a1a2e;">📱 How to access your dashboard</p>
        <table style="width:100%;border-collapse:collapse;">
          ${orderRow('Website', `<a href="${loginUrl}" style="color:#c9a84c;">${loginUrl}</a>`)}
          ${orderRow('Your email', email)}
          ${orderRow('Password', 'The one you just created')}
        </table>
        <p style="font-size:13px;color:#888;margin:12px 0 0;">Save this email — it's your access guide.</p>
      </div>

      <div style="${style.btnWrap}">
        <a href="${dashUrl}" style="${style.btn}">Go to My Dashboard →</a>
      </div>

      <hr style="${style.divider}">

      <p style="font-family:Georgia,serif;font-size:16px;color:#1a1a2e;margin-bottom:12px;"><strong>What's in your dashboard?</strong></p>
      <ul style="font-size:14px;color:#444;line-height:2;padding-left:20px;margin:0 0 16px;">
        <li>📊 Your active readings &amp; reports</li>
        <li>🔮 Daily personalised guidance</li>
        <li>🌟 Soul Blueprint tools library</li>
        <li>🎁 Member-only coupons &amp; discounts</li>
        <li>📖 Your reading history — forever</li>
      </ul>

      <hr style="${style.divider}">
      <p style="${style.small}">
        Forgot your password? Visit <a href="${BASE_URL}/auth/reset-password" style="color:#c9a84c;">${BASE_URL}/auth/reset-password</a><br>
        Need help? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#c9a84c;">${SUPPORT_EMAIL}</a> — we respond within 24 hours.
      </p>
    </div>
  `, `Welcome to KAYAL — here's how to access your dashboard`)
}

// ─────────────────────────────────────────────────────────────
// 4. GUEST ACCESS  (for users who skipped account creation)
// ─────────────────────────────────────────────────────────────
export function guestAccess(opts: {
  firstName: string
  email: string
  toolName: string
  toolEmoji: string
  jobId: string | null
  guestToken: string   // short-lived signed token for reading access
}) {
  const { firstName, email, toolName, toolEmoji, jobId, guestToken } = opts
  const readingUrl = `${BASE_URL}/guest/reading/${guestToken}`
  const createAccountUrl = `${BASE_URL}/auth/signup?email=${encodeURIComponent(email)}&ref=guest_purchase`

  return wrap(`
    <div style="${style.body_p}">
      <h1 style="${style.h1}">Your reading is on its way, ${firstName}!</h1>
      <p style="${style.p}">
        We've received your order for <strong>${toolEmoji} ${toolName}</strong>. We'll send you another email the moment your reading is ready.
      </p>

      <div style="${style.card}">
        <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#1a1a2e;">📧 Order confirmation</p>
        <table style="width:100%;border-collapse:collapse;">
          ${orderRow('Email', email)}
          ${jobId ? orderRow('Reference', `#${jobId.slice(0, 8).toUpperCase()}`) : ''}
          ${orderRow('Status', '<span style="color:#f59e0b;font-weight:bold;">⏳ Processing</span>')}
        </table>
      </div>

      <div style="${style.card}" >
        <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#c9a84c;">🔐 Access your reading anytime</p>
        <p style="font-size:14px;color:#444;margin:0 0 12px;">
          We've created a guest access link for your reading. <strong>Save this email</strong> — it's the only way to access your reading without an account.
        </p>
        <a href="${readingUrl}" style="color:#c9a84c;word-break:break-all;font-size:13px;">${readingUrl}</a>
      </div>

      <hr style="${style.divider}">

      <p style="font-family:Georgia,serif;font-size:16px;color:#1a1a2e;margin-bottom:8px;"><strong>Unlock the full experience</strong></p>
      <p style="${style.p}">Create a free account to:</p>
      <ul style="font-size:14px;color:#444;line-height:2;padding-left:20px;margin:0 0 20px;">
        <li>Save your reading permanently — never lose it</li>
        <li>Access a personalised member dashboard</li>
        <li>Receive daily Soul Blueprint guidance</li>
        <li>Get member discounts on future readings</li>
      </ul>
      <div style="${style.btnWrap}">
        <a href="${createAccountUrl}" style="${style.btn}">Create Free Account →</a>
      </div>

      <hr style="${style.divider}">
      <p style="${style.small}">
        Questions? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#c9a84c;">${SUPPORT_EMAIL}</a>
      </p>
    </div>
  `, `Order confirmed — your ${toolName} is being prepared`)
}

// ─────────────────────────────────────────────────────────────
// 5. UPSELL  (sent ~24h after reading is delivered)
// ─────────────────────────────────────────────────────────────
export function upsell(opts: {
  firstName: string
  completedToolName: string
  completedToolEmoji: string
  recommendedTools: { name: string; emoji: string; price: number; id: string; tagline: string }[]
  bundleCode?: string   // coupon code for bundle discount
  bundleDiscount?: number
}) {
  const { firstName, completedToolName, completedToolEmoji, recommendedTools, bundleCode, bundleDiscount } = opts

  return wrap(`
    <div style="${style.body_p}">
      <h1 style="${style.h1}">How was your ${completedToolEmoji} reading, ${firstName}?</h1>
      <p style="${style.p}">
        We hope your <strong>${completedToolName}</strong> brought you clarity. Soul Blueprint work is most powerful when you look at multiple dimensions — here are the readings that work best alongside what you've already discovered.
      </p>

      ${bundleCode ? `
      <div style="background:linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04));border:2px solid #c9a84c;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#888;letter-spacing:2px;text-transform:uppercase;">Exclusive member offer</p>
        <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1a1a2e;">${bundleDiscount}% off your next reading</p>
        <p style="margin:0;font-size:18px;font-weight:bold;color:#c9a84c;letter-spacing:4px;">${bundleCode}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#888;">Valid for 7 days · One use per account</p>
      </div>
      ` : ''}

      ${recommendedTools.map(t => `
      <div style="border:1px solid #e8e0d0;border-radius:8px;padding:20px;margin-bottom:16px;">
        <table style="width:100%;"><tr>
          <td style="font-size:36px;width:50px;vertical-align:top;">${t.emoji}</td>
          <td style="padding-left:16px;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#1a1a2e;">${t.name}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#888;font-style:italic;">${t.tagline}</p>
            <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:18px;color:#c9a84c;">
              from $${t.price}${bundleCode ? ` <span style="font-size:12px;color:#16a34a;">(${bundleDiscount}% off with ${bundleCode})</span>` : ''}
            </p>
            <a href="${BASE_URL}/purchase/${t.id}${bundleCode ? `?coupon=${bundleCode}` : ''}" style="${style.btn};font-size:12px;padding:10px 20px;">
              Get This Reading →
            </a>
          </td>
        </tr></table>
      </div>`).join('')}

      <hr style="${style.divider}">
      <p style="${style.small}">
        You received this because you completed a reading on KAYAL LifeOS.<br>
        <a href="${BASE_URL}/unsubscribe" style="color:#c9a84c;">Unsubscribe from reading recommendations</a>
      </p>
    </div>
  `, `Continue your Soul Blueprint journey — special offer inside`)
}

// ─────────────────────────────────────────────────────────────
// 6. LOGIN REMINDER  (sent if user hasn't logged in 48h after purchase)
// ─────────────────────────────────────────────────────────────
export function loginReminder(opts: {
  firstName: string
  email: string
  toolName: string
  toolEmoji: string
  jobId: string | null
}) {
  const { firstName, email, toolName, toolEmoji, jobId } = opts
  const dashUrl = `${BASE_URL}/member/dashboard${jobId ? `?open=${jobId}` : ''}`
  const loginUrl = `${BASE_URL}/auth/login`
  const resetUrl = `${BASE_URL}/auth/reset-password`

  return wrap(`
    <div style="${style.body_p}">
      <h1 style="${style.h1}">Your reading is waiting, ${firstName} 🌙</h1>
      <p style="${style.p}">
        Your <strong>${toolEmoji} ${toolName}</strong> has been completed and is in your dashboard — but it looks like you haven't viewed it yet.
      </p>

      <div style="${style.btnWrap}">
        <a href="${dashUrl}" style="${style.btn}">View My Reading Now →</a>
      </div>

      <div style="${style.card}">
        <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#1a1a2e;">🔑 How to log in</p>
        <table style="width:100%;border-collapse:collapse;">
          ${orderRow('Website', `<a href="${loginUrl}" style="color:#c9a84c;">${loginUrl}</a>`)}
          ${orderRow('Email', email)}
        </table>
        <p style="font-size:13px;color:#888;margin:12px 0 0;">
          Forgot your password? <a href="${resetUrl}" style="color:#c9a84c;">Reset it here →</a>
        </p>
      </div>

      <p style="${style.p}">
        Your readings are saved permanently — they'll be there whenever you're ready. Many clients find they return to their blueprint at life's crossroads and discover new layers each time.
      </p>

      <hr style="${style.divider}">
      <p style="${style.small}">
        Need help logging in? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#c9a84c;">${SUPPORT_EMAIL}</a> and we'll sort it within 24 hours.
      </p>
    </div>
  `, `Your ${toolName} reading is ready and waiting for you`)
}

// ─────────────────────────────────────────────────────────────
// 7. IMAGES RECEIVED  (sent after user uploads photos post-payment)
// ─────────────────────────────────────────────────────────────
export function imagesReceived(opts: {
  firstName: string
  toolName: string
  toolEmoji: string
  jobId: string
}) {
  const { firstName, toolName, toolEmoji, jobId } = opts
  return wrap(`
    <div style="${style.body_p}">
      <h1 style="${style.h1}">Images received — processing now! 📸</h1>
      <p style="${style.p}">
        We've received your photos for <strong>${toolEmoji} ${toolName}</strong>. Your reading is now being generated and you'll receive an email with your results shortly.
      </p>
      <div style="${style.card}">
        <table style="width:100%;border-collapse:collapse;">
          ${orderRow('Reading', `${toolEmoji} ${toolName}`)}
          ${orderRow('Reference', `#${jobId.slice(0, 8).toUpperCase()}`)}
          ${orderRow('Images', '<span style="color:#16a34a;">✓ Received &amp; encrypted</span>')}
          ${orderRow('Status', '<span style="color:#f59e0b;">⏳ Generating your reading…</span>')}
        </table>
      </div>
      <p style="${style.p}">
        Typical generation time is 30–90 minutes. Your images are encrypted end-to-end and will be permanently deleted from our servers within 30 days of delivery.
      </p>
      <hr style="${style.divider}">
      <p style="${style.small}">Reference: #${jobId.slice(0, 8).toUpperCase()} — keep this in case you need support.</p>
    </div>
  `, `We received your images — generating your ${toolName}`)
}

// ── Barrel export ───────────────────────────────────────────────────────────
export const templates = {
  purchaseConfirmation,
  readingReady,
  welcomeAndLogin,
  guestAccess,
  upsell,
  loginReminder,
  imagesReceived,
}
