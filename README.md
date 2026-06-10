Kayal LifeOS - README.md
markdown
# Kayal LifeOS

The Operating System for Your Soul — A personal insight platform that delivers hyper-personalized reports based on numerology, palmistry, and physiognomy.

![Kayal LifeOS](public/og-image.png)

## 🚀 Overview

Kayal LifeOS combines three ancient wisdom systems into one modern, beautiful web application. Users can discover deep insights about themselves through:

- **Numerology** - Based on date of birth and name
- **Palmistry** - Analysis of hand images
- **Physiognomy** - Analysis of face images

## ✨ Features

### Core Features
- **Multi-step Onboarding** - Frictionless input flow for collecting user data
- **Free Reports** - Immediate value with 3 free numerology reports
- **Premium Reports** - 72+ detailed reports across love, career, wealth, and spirituality
- **Image Upload** - Upload hand and face images for deeper analysis
- **Real-time Processing** - Engaging loading screen with progress indicators

### Viral Features
- **Share Buttons Everywhere** - Every insight, report, and score is shareable
- **Referral System** - Users earn rewards when friends join
- **Compatibility Challenge** - Compare with friends and share results
- **Leaderboard** - Gamified referral tracking

### Engagement Features
- **Live Chat** - AI-powered conversations based on user's complete profile
- **Daily Guidance** - Personalized daily insights
- **Dashboard** - Central hub for all insights and activity
- **Domain Pages** - Organized insights by category (Love, Career, Wealth, etc.)

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (React)
- **Styling**: Tailwind CSS + Framer Motion
- **State Management**: Zustand
- **API Integration**: React Query + Axios
- **Authentication**: NextAuth.js
- **Forms**: React Hook Form + Zod
- **Image Upload**: react-dropzone + CompressorJS
- **PDF Generation**: @react-pdf/renderer
- **Real-time**: Socket.io-client
- **Payments**: Stripe
- **Notifications**: Sonner

### Backend (Separate Repository)
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **AI/ML**: Custom models for palmistry and physiognomy
- **API**: REST + WebSockets

## 📁 Project Structure
kayal-lifeos/
├── app/ # Next.js App Router
│ ├── layout.tsx # Root layout
│ ├── page.tsx # Landing page
│ ├── api/ # API routes
│ ├── onboarding/ # Onboarding flow
│ ├── dashboard/ # Dashboard pages
│ ├── domain/ # Domain pages (love, career, etc.)
│ ├── report/ # Individual report pages
│ ├── compatibility/ # Compatibility tool
│ ├── chat/ # Live chat interface
│ └── referral/ # Referral dashboard
├── components/ # Reusable components
│ ├── ui/ # UI primitives
│ ├── layout/ # Layout components
│ ├── onboarding/ # Onboarding-specific
│ ├── dashboard/ # Dashboard-specific
│ └── referral/ # Referral-specific
├── lib/ # Utilities, stores, constants
│ ├── api/ # API clients
│ ├── store/ # Zustand stores
│ ├── utils/ # Helper functions
│ ├── constants/ # App constants
│ ├── hooks/ # Custom React hooks
│ └── types/ # TypeScript types
├── public/ # Static assets
│ ├── images/ # Image assets
│ ├── icons/ # Icon assets
│ └── fonts/ # Font files
├── styles/ # Global styles
└── middleware.ts # Next.js middleware

text

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend server running at `http://127.0.0.1:8000`

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/kayal-lifeos.git
cd kayal-lifeos
Install dependencies

bash
npm install
# or
yarn install
Set up environment variables

bash
cp .env.example .env.local
Edit .env.local with your configuration:

env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
# Add other variables as needed
Run the development server

bash
npm run dev
# or
yarn dev
Open your browser
Navigate to http://localhost:3000

🎨 Design System
Colors
Primary: Deep purple (#1A103C → #7A5AF5) - Trust, wisdom, depth

Secondary: Warm gold (#B8860B → #E5C87B) - Accents, highlights

Neutral: Warm grays (#F9F7F5 → #1A1A1A) - Clean, trustworthy

Typography
Headlines: Cormorant Garamond - Elegant, serif

Body: Inter - Clean, readable sans-serif

Spacing
Consistent 4px grid system (--space-1: 4px, --space-2: 8px, etc.)

📱 Key Features Implementation
Authentication
Email/password registration and login

Google and Facebook OAuth

JWT-based sessions

Protected routes with middleware

Onboarding Flow
Basic Info - Name and date of birth

Choose Path - Select free or premium options

Upload - Hand/face images (if chosen)

Processing - Engaging loading screen

Dashboard
Daily guidance card

Referral progress tracker

Recent insights feed

Domain grid with counts

Referral System
Unique referral links for each user

Tiered rewards (reports, months, lifetime)

Leaderboard with gamification

Share buttons on every insight

Chat Interface
Real-time WebSocket connection

AI-powered responses based on user data

Message history and reactions

Suggested questions

🚀 Deployment
Deploy to Vercel
The easiest way to deploy is using Vercel:

bash
npm install -g vercel
vercel
For production:

bash
vercel --prod
Environment Variables
Set these in your Vercel project:

NEXT_PUBLIC_API_URL - Your production API URL

NEXTAUTH_URL - Your production URL

NEXTAUTH_SECRET - Strong random string

GOOGLE_CLIENT_ID - For Google OAuth

GOOGLE_CLIENT_SECRET - For Google OAuth

FACEBOOK_CLIENT_ID - For Facebook OAuth

FACEBOOK_CLIENT_SECRET - For Facebook OAuth

STRIPE_PUBLISHABLE_KEY - For payments

STRIPE_SECRET_KEY - For payments

RESEND_API_KEY - For emails

📊 Performance Optimization
Images: Next.js Image optimization, lazy loading

Code Splitting: Dynamic imports for heavy components

Caching: SWR for data fetching with stale-while-revalidate

Bundle: Analyzed with @next/bundle-analyzer

Core Web Vitals: Monitored with Vercel Analytics

🔒 Security
CSRF protection via NextAuth

Rate limiting on API routes

Input sanitization

HTTP-only cookies for tokens

HTTPS enforcement

Security headers (CSP, XSS protection)

🧪 Testing
bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run linting
npm run lint
📈 Monitoring
Error Tracking: Sentry integration

Analytics: Google Analytics / Mixpanel

Performance: Vercel Analytics

User Feedback: Hotjar / Userback

🤝 Contributing
Fork the repository

Create your feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add some amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

📄 License
This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

📞 Support
Documentation: docs.kayallifeos.com

Email: support@kayallifeos.com

Twitter: @kayallifeos

Discord: Join our community

🙏 Acknowledgments
FastAPI team for the amazing backend framework

Next.js team for the incredible frontend framework

Our early users for invaluable feedback

The open-source community for inspiration and tools

Built with ❤️ for seekers everywhere

text

This README.md is complete and ready to use. It includes:

1. **Project Overview** - What Kayal LifeOS is and what it does
2. **Features** - Comprehensive list of core, viral, and engagement features
3. **Tech Stack** - All technologies used in the project
4. **Project Structure** - Complete folder structure explanation
5. **Getting Started** - Installation and setup instructions
6. **Design System** - Colors, typography, and spacing
7. **Key Features** - Detailed explanation of main features
8. **Deployment** - Instructions for deploying to Vercel
9. **Performance** - Optimization strategies
10. **Security** - Security measures implemented
11. **Testing** - How to run tests
12. **Monitoring** - Analytics and error tracking
13. **Contributing** - How to contribute to the project
14. **License** - Copyright information
15. **Support** - Where to get help