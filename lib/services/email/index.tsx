import { Resend } from 'resend'
import { render } from '@react-email/render'
import { WelcomeEmail, PurchaseEmail, ReferralEmail, WeeklyDigest } from './templates'

export class EmailService {
  private resend: Resend
  private queue: EmailQueue
  
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
    this.queue = new EmailQueue()
  }

  async sendTransactional(to: string, template: string, data: any): Promise<void> {
    const emailTemplates = {
      welcome: WelcomeEmail,
      purchase: PurchaseEmail,
      referral: ReferralEmail,
      digest: WeeklyDigest
    }
    
    const Template = emailTemplates[template]
    const html = render(<Template {...data} />)
    
    await this.resend.emails.send({
      from: 'Kayal LifeOS <noreply@kayalsoulpath.com>',
      to,
      subject: this.getSubject(template, data),
      html
    })
  }

  async sendMarketing(to: string[], campaign: string, data: any): Promise<void> {
    // Queue for batch sending
    await this.queue.add({
      to,
      campaign,
      data,
      scheduledFor: this.getOptimalSendTime(to)
    })
  }

  async createAutomation(trigger: string, actions: AutomationAction[]): Promise<void> {
    // Create automated flows
    // e.g., 3 days after signup -> send educational series
    // e.g., 7 days without purchase -> send discount
  }
}

// Automated Email Flows
export const emailAutomations = [
  {
    trigger: 'user.created',
    delay: 3600, // 1 hour
    action: 'send.welcome.series.day1'
  },
  {
    trigger: 'user.created',
    delay: 86400 * 3, // 3 days
    action: 'send.educational.content'
  },
  {
    trigger: 'user.created',
    delay: 86400 * 7, // 7 days
    action: 'send.discount.offer',
    condition: 'no_purchase_yet'
  },
  {
    trigger: 'user.created',
    delay: 86400 * 30, // 30 days
    action: 'send.survey',
    condition: 'no_purchase_yet'
  },
  {
    trigger: 'purchase.completed',
    delay: 86400, // 1 day
    action: 'send.thankyou'
  },
  {
    trigger: 'purchase.completed',
    delay: 86400 * 30, // 30 days
    action: 'send.review.request'
  },
  {
    trigger: 'referral.earned',
    delay: 3600, // 1 hour
    action: 'send.congratulations'
  }
]