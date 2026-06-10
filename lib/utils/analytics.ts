type EventParams = Record<string, any>

class Analytics {
  private static instance: Analytics
  private isInitialized = false

  private constructor() {}

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics()
    }
    return Analytics.instance
  }

  /**
   * Initialize analytics
   */
  init(): void {
    if (this.isInitialized) return
    
    // Initialize Google Analytics
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
      // @ts-ignore
      window.dataLayer = window.dataLayer || []
      // @ts-ignore
      window.gtag = function() { window.dataLayer.push(arguments) }
      // @ts-ignore
      window.gtag('js', new Date())
      // @ts-ignore
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID)
    }
    
    this.isInitialized = true
  }

  /**
   * Track page view
   */
  pageView(url: string, title?: string): void {
    if (!this.isInitialized) return
    
    // Google Analytics
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
      // @ts-ignore
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
        page_title: title
      })
    }
  }

  /**
   * Track event
   */
  event(action: string, category: string, label?: string, value?: number): void {
    if (!this.isInitialized) return
    
    // Google Analytics
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
      // @ts-ignore
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      })
    }
  }

  /**
   * Track user action with custom parameters
   */
  track(action: string, params: EventParams = {}): void {
    if (!this.isInitialized) return
    
    // Google Analytics
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
      // @ts-ignore
      window.gtag('event', action, params)
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics:', action, params)
    }
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, element: string, params: EventParams = {}): void {
    this.track('engagement', {
      action,
      element,
      ...params
    })
  }

  /**
   * Track conversion
   */
  trackConversion(type: string, value?: number, params: EventParams = {}): void {
    this.track('conversion', {
      conversion_type: type,
      value,
      ...params
    })
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: string): void {
    this.track('error', {
      error_message: error.message,
      error_stack: error.stack,
      context
    })
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, action: string, params: EventParams = {}): void {
    this.track('feature', {
      feature,
      action,
      ...params
    })
  }

  /**
   * Set user properties
   */
  setUserProperties(userId: string, properties: Record<string, any>): void {
    if (!this.isInitialized) return
    
    // Google Analytics
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
      // @ts-ignore
      window.gtag('set', 'user_id', userId)
      
      // Set custom dimensions
      Object.entries(properties).forEach(([key, value]) => {
        // @ts-ignore
        window.gtag('set', { [key]: value })
      })
    }
  }
}

export const analytics = Analytics.getInstance()

// Pre-defined events
export const AnalyticsEvents = {
  // Onboarding
  ONBOARDING_START: 'onboarding_start',
  ONBOARDING_STEP: 'onboarding_step',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  
  // Reports
  REPORT_VIEW: 'report_view',
  REPORT_SHARE: 'report_share',
  REPORT_DOWNLOAD: 'report_download',
  REPORT_PURCHASE: 'report_purchase',
  
  // Compatibility
  COMPATIBILITY_CHECK: 'compatibility_check',
  COMPATIBILITY_SHARE: 'compatibility_share',
  
  // Chat
  CHAT_START: 'chat_start',
  CHAT_MESSAGE: 'chat_message',
  
  // Referrals
  REFERRAL_LINK_COPIED: 'referral_link_copied',
  REFERRAL_SHARE: 'referral_share',
  REFERRAL_CLICK: 'referral_click',
  REFERRAL_CONVERSION: 'referral_conversion',
  REWARD_CLAIMED: 'reward_claimed',
  
  // User
  USER_LOGIN: 'user_login',
  USER_REGISTER: 'user_register',
  USER_LOGOUT: 'user_logout',
  USER_UPDATE: 'user_update',
  
  // Subscription
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_SUCCESS: 'subscription_success',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  
  // Engagement
  SHARE_BUTTON_CLICK: 'share_button_click',
  LIKE_BUTTON_CLICK: 'like_button_click',
  DASHBOARD_VIEW: 'dashboard_view',
  DOMAIN_VIEW: 'domain_view'
}