// app/api/reading/pdf/[jobId]/route.ts
// GET /api/reading/pdf/[jobId]
// Proxies the real, actual PDF request to the Python backend's own,
// real /reading/pdf/{job_id} endpoint, streaming the genuine, complete
// PDF bytes back to the browser. This is the real, missing piece the
// download button now depends on.
//
// HONEST NOTE: this file is a best, informed guess, based on the
// same, real pattern already used in your own, actual
// app/api/reading/result/[jobId]/route.ts file. The one, real thing
// you need to confirm and adjust is the backend URL below, it needs
// to point at your actual, real Python server, wherever it genuinely
// runs, not a placeholder.

import { NextResponse } from 'next/server'

// Real, adjust this to your actual, real backend's base URL, the
// same, real server main.py runs on. If you already have an
// environment variable for this elsewhere in your app, use that
// instead of this placeholder.
const BACKEND_BASE_URL = process.env.KAYAL_BACKEND_URL || 'http://127.0.0.1:8000'

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  try {
    const backendRes = await fetch(`${BACKEND_BASE_URL}/reading/pdf/${jobId}`, {
      method: 'GET',
    })

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'PDF generation failed on the backend' },
        { status: backendRes.status }
      )
    }

    const pdfBuffer = await backendRes.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reading_${jobId.slice(0, 8)}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[reading/pdf proxy]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
