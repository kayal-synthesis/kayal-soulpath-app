import { WebPush } from 'web-push'
import { Twilio } from 'twilio'
import { Expo } from 'expo-server-sdk'

export class NotificationService {
  private webPush: WebPush
  private twilio: Twilio
  private expo: Expo
  
  constructor() {
    this.webPush = new WebPush({ vapidDetails: { subject: process.env.NEXT_PUBLIC_APP_URL!, publicKey: process.env.VAPID_PUBLIC_KEY ?? "", privateKey: process.env.VAPID_PRIVATE_KEY ?? "" } })
    this.twilio = new Twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!)
    this.expo = new Expo()
  }

  async sendToUser(userId: string, notification: Notification): Promise<void> {
    const user = await this.getUserPreferences(userId)
    
    const promises = []
    
    if (user.preferences.push) {
      promises.push(this.sendPush(user, notification))
    }
    
    if (user.preferences.email) {
      promises.push(this.sendEmail(user, notification))
    }
    
    if (user.preferences.sms && notification.urgent) {
      promises.push(this.sendSMS(user, notification))
    }
    
    if (user.preferences.inApp) {
      promises.push(this.saveInApp(userId, notification))
    }
    
    await Promise.all(promises)
  }

  async sendToAll(notification: Notification, filters?: UserFilter): Promise<void> {
    const users = await this.getUsersByFilter(filters)
    
    // Batch send in chunks
    const chunks = chunk(users, 100)
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(user => this.sendToUser(user.id, notification)))
    }
  }

  async scheduleNotification(userId: string, notification: Notification, schedule: Date): Promise<void> {
    await this.saveScheduled(userId, notification, schedule)
  }
}

// Notification templates
export const notificationTemplates = {
  welcome: {
    title: '✨ Welcome to Kayal LifeOS!',
    body: 'Start your journey of self-discovery today.',
    actions: ['explore', 'later']
  },
  daily_insight: {
    title: '🌅 Your Daily Insight',
    body: 'See what the universe has in store for you today.',
    actions: ['view', 'later']
  },
  purchase_complete: {
    title: '🎉 Purchase Successful!',
    body: 'Your report is ready to view.',
    actions: ['view_report', 'download_pdf']
  },
  referral_earned: {
    title: '🎁 You earned a referral reward!',
    body: 'Someone purchased using your link.',
    actions: ['view_earnings', 'share_more']
  },
  payout_processed: {
    title: '💰 Payout Sent!',
    body: 'Your earnings have been transferred.',
    actions: ['view_details', 'transaction_history']
  },
  churn_risk: {
    title: '🤔 We miss you!',
    body: "Haven't visited in a while. Here's something special...",
    actions: ['view_offer', 'dismiss']
  }
}
