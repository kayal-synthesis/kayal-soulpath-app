import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = headers()
  
  const ip = 
    headersList.get('x-forwarded-for')?.split(',')[0] ||
    headersList.get('x-real-ip') ||
    headersList.get('cf-connecting-ip') ||
    'unknown'
  
  const country = headersList.get('cf-ipcountry') || 
                  headersList.get('x-vercel-ip-country') ||
                  'unknown'
  
  const city = headersList.get('x-vercel-ip-city') || 'unknown'
  const region = headersList.get('x-vercel-ip-country-region') || 'unknown'

  return NextResponse.json({
    ip,
    country,
    city,
    region,
    timestamp: new Date().toISOString()
  })
}