import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, source, anonymousId } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      )
    }

    // TODO: Replace with your actual database logic
    // This is a mock implementation
    
    // 1. Check if user already exists
    // const existingUser = await db.referralUser.findUnique({ where: { email } })
    // if (existingUser) {
    //   return NextResponse.json(
    //     { error: 'Email already registered' },
    //     { status: 400 }
    //   )
    // }

    // 2. Generate unique referral code
    const generateReferralCode = (name: string) => {
      const prefix = name.substring(0, 3).toUpperCase()
      const random = Math.random().toString(36).substring(2, 6).toUpperCase()
      const timestamp = Date.now().toString().slice(-4)
      return `${prefix}${random}${timestamp}`
    }

    const referralCode = generateReferralCode(name)

    // 3. Hash password (you should use bcrypt or similar)
    // const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Create user in database
    // const newUser = await db.referralUser.create({
    //   data: {
    //     name,
    //     email,
    //     password: hashedPassword,
    //     referralCode,
    //     source: source || 'direct',
    //     linkedAnonymousId: anonymousId || null,
    //     stats: {
    //       create: {
    //         totalClicks: 0,
    //         totalConversions: 0,
    //         totalEarnings: 0,
    //         pendingCommissions: 0,
    //         conversionRate: 0,
    //         rank: 0
    //       }
    //     }
    //   },
    //   include: { stats: true }
    // })

    // Mock response
    const newUser = {
      id: 'ref_' + Date.now(),
      name,
      email,
      referralCode,
      source: source || 'direct',
      linkedAnonymousId: anonymousId || null,
      createdAt: new Date().toISOString(),
      stats: {
        totalClicks: 0,
        totalConversions: 0,
        totalEarnings: 0,
        pendingCommissions: 0,
        conversionRate: 0,
        rank: Math.floor(Math.random() * 1000) + 1
      }
    }

    // If they came from anonymous, we might want to track this for future
    if (anonymousId) {
      console.log(`Referral account created from anonymous session: ${anonymousId}`)
      // TODO: Link anonymous session data to this new account
      // await db.anonymousSession.update({
      //   where: { id: anonymousId },
      //   data: { convertedToReferralId: newUser.id }
      // })
    }

    return NextResponse.json(newUser, { status: 201 })

  } catch (error) {
    console.error('Referral creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create referral account' },
      { status: 500 }
    )
  }
}