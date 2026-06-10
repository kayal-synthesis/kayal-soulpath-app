export default function DashboardLoading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#FDFCFA',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid #F0D6DC',
          borderTopColor: '#B94D6A',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#8C7E76',
          letterSpacing: '0.1em',
        }}>
          Loading your blueprint…
        </p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}