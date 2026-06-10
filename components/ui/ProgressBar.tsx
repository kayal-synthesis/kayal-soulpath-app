interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'success'
  className?: string
}

export const ProgressBar = ({ 
  value, 
  max = 100, 
  showLabel = false,
  size = 'md',
  color = 'primary',
  className = ''
}: ProgressBarProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const colors = {
    primary: 'bg-primary-600',
    secondary: 'bg-secondary-500',
    success: 'bg-success'
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-neutral-600">Progress</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-neutral-200 rounded-full overflow-hidden ${sizes[size]}`}>
        <div 
          className={`${colors[color]} transition-all duration-300 ease-out ${sizes[size]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}