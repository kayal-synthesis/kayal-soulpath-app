interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'white'
  className?: string
}

export const Spinner = ({ size = 'md', color = 'primary', className = '' }: SpinnerProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const colors = {
    primary: 'border-primary-600',
    secondary: 'border-secondary-500',
    white: 'border-white'
  }

  return (
    <div
      className={`${sizes[size]} ${colors[color]} border-2 border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="loading"
    />
  )
}