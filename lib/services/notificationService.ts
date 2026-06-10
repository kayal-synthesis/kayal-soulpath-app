// @ts-nocheck
import nodemailer from 'nodemailer'
import { addDays, format } from 'date-fns'


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export class NotificationService {
  async sendDailyNotifications() {
    const activeUsers = await prisma.user.findMany({
      where: {
        trialActive: true,
        trialEndDate: { gt: new Date() },
        OR: [
          { lastNotificationSent: null },
          { lastNotificationSent: { lt: addDays(new Date(), -1) } }
        ]
      }
    })

    let sent = 0
    for (const user of activeUsers) {
      const dayNumber = this.calculateUserDay(user)
      await this.sendDayNotification(user, dayNumber)
      sent++
    }

    return sent
  }

  async sendAbandonedCartReminders() {
    // Find users who viewed pricing but didn't purchase
    const abandoned = await prisma.user.findMany({
      where: {
        upgradedAt: null,
        lastVisit: { gt: addDays(new Date(), -3) },
        email: { not: null }
      }
    })

    let sent = 0
    for (const user of abandoned) {
      await this.sendReminderEmail(user)
      sent++
    }

    return sent
  }

  private calculateUserDay(user: any): number {
    const daysSinceStart = Math.floor(
      (new Date().getTime() - user.trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return Math.min(daysSinceStart + 1, 7)
  }

  private async sendDayNotification(user: any, day: number) {
    const templates: Record<number, { subject: string; html: string }> = {
      1: {
        subject: `✨ Welcome ${user.name}! Discover who you are`,
        html: `
          <h1>Welcome to Your Journey, ${user.name}!</h1>
          <p>Today we're discovering who you truly are at your core.</p>
          <a href="${process.env.APP_URL}/dashboard">View Your Day</a>
        `
      },
      2: {
        subject: `⚡ ${user.name}, today's energy is powerful`,
        html: `<p>See what today has in store for you...</p>`
      },
      3: {
        subject: `🔮 ${user.name}, we're seeing a pattern...`,
        html: `<p>Something interesting is emerging in your energy...</p>`
      },
      4: {
        subject: `💫 ${user.name}, a deeper truth awaits`,
        html: `<p>You're ready for deeper insights...</p>`
      },
      5: {
        subject: `🎁 ${user.name}, an opportunity is forming`,
        html: `<p>Someone needs what only you can offer...</p>`
      },
      6: {
        subject: `🌟 ${user.name}, you're breaking through`,
        html: `<p>You're breaking an old pattern today...</p>`
      },
      7: {
        subject: `⏰ ${user.name}, your free trial ends tomorrow`,
        html: `
          <h1>Your 7-day journey is almost complete</h1>
          <p>Tomorrow you'll lose access to your daily guidance.</p>
          <a href="${process.env.APP_URL}/pricing">Continue Your Journey →</a>
        `
      }
    }

    const template = templates[day]
    if (!template || !user.email) return

    try {
      await transporter.sendMail({
        from: '"Kayal LifeOS" <daily@kayalsoulpath.com>',
        to: user.email,
        subject: template.subject,
        html: template.html
      })

      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          type: `DAY_${day}`,
          sentAt: new Date()
        }
      })

      await prisma.user.update({
        where: { id: user.id },
        data: { lastNotificationSent: new Date() }
      })
    } catch (error) {
      console.error(`Failed to send day ${day} notification:`, error)
    }
  }

  private async sendReminderEmail(user: any) {
    if (!user.email) return

    try {
      await transporter.sendMail({
        from: '"Kayal LifeOS" <offers@kayalsoulpath.com>',
        to: user.email,
        subject: `🌟 ${user.name}, your journey awaits`,
        html: `
          <h1>Don't miss out on your full potential</h1>
          <p>We noticed you haven't completed your purchase. Your personalized insights are waiting.</p>
          <a href="${process.env.APP_URL}/pricing?coupon=WELCOME20">Get 20% off →</a>
        `
      })
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }
}