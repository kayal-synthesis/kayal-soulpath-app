import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// metadataBase was missing entirely. Without it, Next.js has to guess how
// to resolve relative URLs used in openGraph.images, alternates.canonical,
// and similar, and in production that guess can silently resolve to the
// wrong host, in some setups even localhost. This is the single most
// likely reason app.kayalsoulpath.com's real content was never properly
// represented to crawlers, everything below this line depends on it
// being correct.
const metadataBase = new URL('https://app.kayalsoulpath.com')

export const metadata: Metadata = {
  metadataBase,
  title: {
    default:  'KAYAL LifeOS | Numerology & Astrology Readings',
    template: '%s | KAYAL LifeOS',
  },
  description: 'Discover your Soul Blueprint through numerology, astrology, and physiognomy. Personalized readings built from your exact birth data, name, and face.',
  robots: {
    // Explicit rather than relying on Next.js defaults, since indexing
    // this app was confirmed as genuinely wanted, not incidental.
    index:  true,
    follow: true,
    googleBot: {
      index:  true,
      follow: true,
    },
  },
  alternates: {
    canonical: 'https://app.kayalsoulpath.com',
  },
  openGraph: {
    title:       'KAYAL LifeOS | Numerology & Astrology Readings',
    description: 'Discover your Soul Blueprint through numerology, astrology, and physiognomy, personalized readings built from your exact birth data.',
    url:         'https://app.kayalsoulpath.com',
    siteName:    'KAYAL LifeOS',
    type:        'website',
    images: [
      {
        // Resolves against metadataBase above, since public/images/tools/
        // maps directly to the /images/tools/ URL path in Next.js.
        // Width/height deliberately omitted, real dimensions weren't
        // confirmed, and most platforms auto-detect the actual size from
        // the file rather than trusting declared values anyway.
        url: '/images/tools/the_Calling.webp',
        alt: 'KAYAL LifeOS',
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'KAYAL LifeOS | Numerology & Astrology Readings',
    description: 'Discover your Soul Blueprint through numerology, astrology, and physiognomy, personalized readings built from your exact birth data.',
    images: ['/images/tools/the_Calling.webp'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple:    '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-head"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-59TXBPFG');`,
          }}
        />
        {/* End Google Tag Manager */}
        {/* Google Analytics GA4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-M6BFCPB2EP"
          strategy="afterInteractive"
        />
        <Script
          id="ga4-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-M6BFCPB2EP');
            `,
          }}
        />
        {/* End Google Analytics GA4 */}
      </head>

      {/*
        NOTE: Inter font class is applied at body level for all public/marketing pages.
        The oracle session pages (ChatSession, VoiceSession, ToolShell) override
        font-family internally via inline styles using --font-display and --font-body
        CSS variables, so they are unaffected by this class.

        The grain texture and mineral dark background are applied by ToolShell
        directly on its wrapper div, NOT on body, so your light marketing
        pages remain completely clean.
      */}
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-59TXBPFG"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        <main className="min-h-screen flex flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
