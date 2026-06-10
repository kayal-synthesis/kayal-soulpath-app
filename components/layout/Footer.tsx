'use client'

import { Heart, Instagram, Youtube, Twitter, Facebook, Music } from 'lucide-react'
import Link from 'next/link'

export const Footer = () => {
  const currentYear = new Date().getFullYear()
  
  const socialLinks = [
    { icon: Instagram, href: 'https://instagram.com/kayalsoulpath', label: 'Instagram', color: 'hover:text-pink-600' },
    { icon: Youtube, href: 'https://youtube.com/@kayalsoulpath', label: 'YouTube', color: 'hover:text-red-600' },
    { icon: Twitter, href: 'https://X.com/kayalsoulpath', label: 'Twitter', color: 'hover:text-blue-400' },
    { icon: Facebook, href: 'https://facebook.com/share/1845UT2nXn/', label: 'Facebook', color: 'hover:text-blue-600' },
    { icon: Music, href: 'https://tiktok.com/@kayalsoulpath', label: 'TikTok', color: 'hover:text-black' },
  ]

  return (
    <footer className="bg-white border-t border-neutral-200 py-4 pb-24 md:pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          
          {/* First Line: Brand + Attribution + Tagline */}
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-600 flex-wrap px-2">
            <span className="text-primary-600">☾</span>
            <span className="font-medium text-neutral-700">KAYAL LifeOS</span>
            <span className="text-neutral-400">•</span>
            <span>Developed with</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 flex-shrink-0" />
            <span>by</span>
            <span className="text-primary-600 font-medium">Kayal Soulpath Institute</span>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-500">A center for learning for seekers</span>
          </div>

          {/* Social Media Icons - Centered */}
          <div className="flex items-center justify-center gap-4 flex-wrap px-2">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-neutral-500 ${social.color} transition-all hover:scale-110`}
                  aria-label={social.label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              )
            })}
          </div>

          {/* Second Line: Legal + Copyright */}
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 flex-wrap px-2">
            <Link href="/privacy" className="hover:text-primary-600 transition whitespace-nowrap">
              Privacy
            </Link>
            <span className="text-neutral-300">•</span>
            <Link href="/terms" className="hover:text-primary-600 transition whitespace-nowrap">
              Terms
            </Link>
            <span className="text-neutral-300">•</span>
            <Link href="/contact" className="hover:text-primary-600 transition whitespace-nowrap">
              Contact
            </Link>
            <span className="text-neutral-300">•</span>
            <span className="whitespace-nowrap">© {currentYear} All rights reserved</span>
          </div>

          {/* DISCLAIMER - Option 1: Small but visible */}
          <div className="mt-2 pt-2 border-t border-neutral-100 w-full max-w-2xl mx-auto">
            <p className="text-[9px] text-neutral-400 text-center leading-relaxed">
              Disclaimer: KAYAL LifeOS provides guidance for self-discovery and spiritual exploration purposes only. 
              All insights are for personal growth and should not replace professional medical, legal, financial, 
              or mental health advice. By using this platform, you acknowledge that your journey is your own responsibility.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}