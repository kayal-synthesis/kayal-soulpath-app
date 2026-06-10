import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:notifications@kayalsoulpath.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class PushNotificationService {
  async sendPushNotification(subscription: PushSubscription, payload: any) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload))
      return true
    } catch (error) {
      console.error('Push failed:', error)
      return false
    }
  }

  async sendDailyPush(user: any, day: number) {
    const payload = {
      title: this.getPushTitle(day, user.name),
      body: this.getPushBody(day),
      url: `${process.env.APP_URL}/dashboard?day=${day}`,
      day: day
    }

    const subscriptions = await this.getUserSubscriptions(user.id)
    
    for (const sub of subscriptions) {
      await this.sendPushNotification(sub, payload)
    }
  }

  private getPushTitle(day: number, name: string): string {
    const titles = {
      1: `✨ ${name}, discover who you are today`,
      2: `⚡ Good morning ${name}! Today's energy is...`,
      3: `🔮 ${name}, we're seeing a pattern...`,
      4: `💫 ${name}, a deeper truth awaits`,
      5: `🎁 ${name}, an opportunity is forming`,
      6: `🌟 ${name}, you're breaking through`,
      7: `⏰ Final day of your free trial, ${name}`
    }
    return titles[day as keyof typeof titles] || `Your daily guidance, ${name}`
  }

  private getPushBody(day: number): string {
    const bodies = {
      1: "Your Life Path reveals who you truly are. Tap to see →",
      2: "Today has powerful energy. Here's what to expect...",
      3: "Something interesting is emerging in your pattern.",
      4: "You're ready for deeper insights. See what we found.",
      5: "Someone needs what only YOU can offer. Find out who.",
      6: "You're breaking an old pattern. This is significant.",
      7: "Tomorrow you lose access. Don't miss what's coming."
    }
    return bodies[day as keyof typeof bodies] || "Your daily guidance is ready"
  }

  private async getUserSubscriptions(userId: string) {
    // Implement database lookup for push subscriptions
    return []
  }
}