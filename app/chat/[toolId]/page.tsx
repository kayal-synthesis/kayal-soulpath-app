'use client'

export default function ChatPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0b0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'EB Garamond', Georgia, serif",
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px 24px',
        maxWidth: '400px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>🔮</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '28px',
          fontWeight: 400,
          color: 'rgba(239,230,214,0.88)',
          marginBottom: '12px',
        }}>
          Coming Soon
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'rgba(154,140,122,0.65)',
          lineHeight: 1.65,
          marginBottom: '32px',
        }}>
          This feature is currently under development.
          Check back soon.
        </p>
        <a href="/dashboard" style={{
          display: 'inline-block',
          padding: '10px 24px',
          borderRadius: '12px',
          background: 'rgba(201,169,110,0.1)',
          border: '1px solid rgba(201,169,110,0.2)',
          color: 'rgba(201,169,110,0.8)',
          fontSize: '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontFamily: "'Cormorant SC', Georgia, serif",
          textDecoration: 'none',
        }}>
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}