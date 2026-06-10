import nodemailer from 'nodemailer'
import { render } from '@react-email/render'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export class EmailService {
  async sendWelcomeEmail(to: string, name: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1A103C, #5D3FD3); color: white; padding: 40px; text-align: center; }
          .button { background: #D4AF37; color: #1A1A1A; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Kayal LifeOS, ${name}!</h1>
          </div>
          <p>Your journey of self-discovery begins now.</p>
          <a href="${process.env.APP_URL}/dashboard" class="button">View Your Dashboard</a>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: '"Kayal LifeOS" <welcome@kayalsoulpath.com>',
      to,
      subject: `Welcome to Kayal LifeOS, ${name}!`,
      html
    })
  }

  async sendPurchaseConfirmation(to: string, name: string, toolName: string, amount: number) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2E5C4E, #4A6FA5); color: white; padding: 40px; text-align: center; }
          .button { background: #D4AF37; color: #1A1A1A; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Purchase, ${name}!</h1>
          </div>
          <p>You've unlocked: <strong>${toolName}</strong></p>
          <p>Amount: $${amount}</p>
          <a href="${process.env.APP_URL}/report/download" class="button">Download Your Report</a>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: '"Kayal LifeOS" <purchases@kayalsoulpath.com>',
      to,
      subject: `Your ${toolName} is ready!`,
      html
    })
  }

  async sendReferralEarned(to: string, name: string, amount: number) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #B8860B, #D4AF37); color: white; padding: 40px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You've Earned a Reward!</h1>
          </div>
          <p>Great news ${name}! Someone purchased using your referral link.</p>
          <p>You've earned: <strong>$${amount}</strong></p>
          <a href="${process.env.APP_URL}/referral">View Your Earnings</a>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: '"Kayal LifeOS" <referrals@kayalsoulpath.com>',
      to,
      subject: '🎁 You earned a referral reward!',
      html
    })
  }
}