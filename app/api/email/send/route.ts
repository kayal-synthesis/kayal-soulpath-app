/**
 * POST /api/email/send
 *
 * Generic email-sending endpoint.
 * Supports: Resend (default), SendGrid, Nodemailer.
 *
 * Body: { to, subject, html, type? }
 * Returns: { success: boolean, id?: string, error?: string }
 *
 * Set env vars:
 *   EMAIL_PROVIDER = 'resend' | 'sendgrid' | 'nodemailer'
 *   EMAIL_FROM     = 'KAYAL LifeOS <noreply@kayalsoulpath.com>'
 *   RESEND_API_KEY or SENDGRID_API_KEY or SMTP_* vars
 */

import { NextRequest, NextResponse } from 'next/server'

const FROM  = process.env.EMAIL_FROM    || 'KAYAL LifeOS <noreply@kayalsoulpath.com>'
const PROVIDER = process.env.EMAIL_PROVIDER || 'resend'

async function sendViaResend(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Resend error')
  return data.id as string
}

async function sendViaSendGrid(to: string, subject: string, html: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SendGrid error: ${text}`)
  }
  return res.headers.get('X-Message-Id') || 'sent'
}

async function sendViaNodemailer(to: string, subject: string, html: string) {
  // Dynamic import so nodemailer isn't bundled unless needed
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  const info = await transporter.sendMail({ from: FROM, to, subject, html })
  return info.messageId
}

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ success: false, error: 'Missing to/subject/html' }, { status: 400 })
    }

    let id: string
    switch (PROVIDER) {
      case 'sendgrid':   id = await sendViaSendGrid(to, subject, html);   break
      case 'nodemailer': id = await sendViaNodemailer(to, subject, html); break
      default:           id = await sendViaResend(to, subject, html);     break
    }

    return NextResponse.json({ success: true, id })
  } catch (err: any) {
    console.error('[email/send]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
