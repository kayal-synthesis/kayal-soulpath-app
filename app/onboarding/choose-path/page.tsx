'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { 
  Sparkles, 
  ChevronRight, 
  Calendar, 
  Clock, 
  MapPin, 
  User,
  ArrowRight,
  Check,
  Loader2
} from 'lucide-react'
import { format, subYears } from 'date-fns'
import confetti from 'canvas-confetti'

// Separate client-only component for stars
const Stars = () => {
  const [stars, setStars] = useState<Array<{ 
    width: number; 
    height: number; 
    top: string; 
    left: string; 
    delay: number;
    duration: number;
    opacity: number;
  }>>([])

  useEffect(() => {
    // Generate stars only on client side
    const generatedStars = [...Array(50)].map(() => ({
      width: Math.random() * 3 + 1,
      height: Math.random() * 3 + 1,
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
      opacity: Math.random() * 0.5 + 0.3
    }))
    setStars(generatedStars)
  }, [])

  if (stars.length === 0) return null

  return (
    <>
      {stars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            width: star.width + 'px',
            height: star.height + 'px',
            top: star.top,
            left: star.left,
            opacity: star.opacity,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [star.opacity, star.opacity * 1.5, star.opacity],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </>
  )
}

// Nebula effects - static for hydration
const NebulaEffects = () => (
  <>
    <div className="absolute top-0 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-purple-600/20 rounded-full blur-[60px] md:blur-[120px] animate-pulse" />
    <div className="absolute bottom-0 left-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blue-600/20 rounded-full blur-[50px] md:blur-[100px] animate-pulse animation-delay-2000" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-pink-600/10 rounded-full blur-[40px] md:blur-[80px] animate-pulse animation-delay-4000" />
  </>
)

// Floating orbs - static positions
const FloatingOrbs = () => (
  <>
    <motion.div
      className="absolute top-10 left-10 md:top-20 md:left-20 w-16 h-16 md:w-32 md:h-32 bg-gradient-to-br from-secondary-500/20 to-secondary-600/20 rounded-full blur-2xl md:blur-3xl"
      animate={{
        y: [0, 20, 0],
        x: [0, 10, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <motion.div
      className="absolute bottom-20 right-10 md:bottom-40 md:right-40 w-24 h-24 md:w-48 md:h-48 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-full blur-2xl md:blur-3xl"
      animate={{
        y: [0, -30, 0],
        x: [0, -20, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </>
)

// Step indicator
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex items-center justify-center gap-3 mb-8">
    {[...Array(totalSteps)].map((_, i) => (
      <motion.div
        key={i}
        className="relative"
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{
          scale: i === currentStep ? 1.2 : 0.8,
          opacity: i === currentStep ? 1 : 0.5,
        }}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            i <= currentStep ? 'bg-secondary-400' : 'bg-white/20'
          }`}
        />
        {i === currentStep && (
          <motion.div
            className="absolute inset-0 rounded-full bg-secondary-400"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ opacity: 0.5 }}
          />
        )}
      </motion.div>
    ))}
  </div>
)

// Animated input field
const AnimatedInput = ({ icon: Icon, label, type = 'text', value, onChange, placeholder, required, hint }: any) => (
  <motion.div
    className="relative group"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <label className="block text-sm font-medium text-white/80 mb-2 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-secondary-400 transition-colors">
        <Icon size={18} />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl
                 text-white placeholder-white/30 focus:outline-none focus:border-secondary-400 
                 transition-all duration-300 group-hover:bg-white/10"
      />
      {value && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400"
        >
          <Check size={16} />
        </motion.div>
      )}
    </div>
    {hint && (
      <p className="text-xs text-white/40 mt-2 ml-1">{hint}</p>
    )}
  </motion.div>
)

// Date picker
const DatePicker = ({ value, onChange }: { value: string; onChange: (date: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <label className="block text-sm font-medium text-white/80 mb-2 ml-1">
      Date of Birth
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
        <Calendar size={18} />
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={format(new Date(), 'yyyy-MM-dd')}
        min={format(subYears(new Date(), 120), 'yyyy-MM-dd')}
        className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl
                 text-white [color-scheme:dark] focus:outline-none focus:border-secondary-400 
                 transition-all duration-300"
        required
      />
    </div>
  </motion.div>
)

// Main component
export default function EnhancedInputPage() {
  const router = useRouter()
  const { setAnonymousUser } = useAnonymousStore()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    birthTime: '',
    birthLocation: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [mascotMessage, setMascotMessage] = useState("Hello seeker! Let's begin your journey...")
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted before animations
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const messages = [
    "What name shall I call you by?",
    "When did your journey begin?",
    "At what hour did you arrive?",
    "Where in this world did you land?",
    "All set! Let me calculate your destiny..."
  ]

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
      setMascotMessage(messages[step + 1])
      
      // Confetti on step complete
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#7A5AF5', '#FFFFFF']
      })
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setMascotMessage("Reading the cosmic patterns...")
    
    // Simulate calculation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setAnonymousUser({
      sessionId: Math.random().toString(36).substring(2),
      ...formData,
      firstVisit: new Date(),
      lastVisit: new Date(),
      visitCount: 1,
      viewedTools: []
    })
    
    // Final confetti burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#7A5AF5', '#FFFFFF', '#2E5C4E']
    })
    
    router.push('/dashboard?welcome=true')
  }

  const canProceed = () => {
    if (step === 0) return formData.name.trim()
    if (step === 1) return formData.dob
    if (step === 2) return true // birthTime optional
    if (step === 3) return true // birthLocation optional
    return false
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0510] via-[#1A103C] to-[#2D1F5E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0B0510] via-[#1A103C] to-[#2D1F5E]">
      {/* Background Elements */}
      <NebulaEffects />
      <FloatingOrbs />
      
      {/* Stars - Client only */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Stars />
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          {/* Mascot/Guide */}
          <motion.div
            className="flex items-center gap-4 mb-8 bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary-500 to-primary-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex-1">
              <p className="text-white/90 text-lg">{mascotMessage}</p>
              <div className="flex gap-1 mt-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-secondary-400 rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Main Card */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl overflow-hidden">
            <div className="p-4 md:p-8">
              {/* Progress */}
              <StepIndicator currentStep={step} totalSteps={4} />

              {/* Title */}
              <motion.h1
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl md:text-3xl font-serif text-white text-center mb-8"
              >
                {step === 0 && "What is your name?"}
                {step === 1 && "When were you born?"}
                {step === 2 && "Your birth time?"}
                {step === 3 && "Where were you born?"}
              </motion.h1>

              {/* Form Fields */}
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <AnimatedInput
                      icon={User}
                      label="Full Name"
                      value={formData.name}
                      onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your name"
                      required
                    />
                    
                    <motion.p
                      className="text-sm text-white/40 italic text-center"
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      Your name holds your soul's signature
                    </motion.p>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="dob"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <DatePicker
                      value={formData.dob}
                      onChange={(date) => setFormData({ ...formData, dob: date })}
                    />
                    
                    <motion.p
                      className="text-sm text-white/40 italic text-center"
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      The stars aligned on this day
                    </motion.p>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="time"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <AnimatedInput
                      icon={Clock}
                      label="Birth Time (optional)"
                      type="time"
                      value={formData.birthTime}
                      onChange={(e: any) => setFormData({ ...formData, birthTime: e.target.value })}
                      placeholder="--:--"
                      hint="Adds accuracy to your reading"
                    />
                    
                    <motion.div
                      className="bg-white/5 rounded-xl p-4"
                      animate={{ backgroundColor: ['rgba(255,255,255,0.05)', 'rgba(212,175,55,0.1)', 'rgba(255,255,255,0.05)'] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <p className="text-sm text-white/60 text-center">
                        ✨ Even without the exact time, your reading will be 90% accurate
                      </p>
                    </motion.div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="location"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <AnimatedInput
                      icon={MapPin}
                      label="Birth Location (optional)"
                      value={formData.birthLocation}
                      onChange={(e: any) => setFormData({ ...formData, birthLocation: e.target.value })}
                      placeholder="City, Country"
                      hint="Adds cultural context"
                    />
                    
                    <motion.p
                      className="text-sm text-white/40 italic text-center"
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      The place where your journey began
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                  className="flex-1 bg-gradient-to-r from-secondary-500 to-primary-600 hover:from-secondary-600 hover:to-primary-700 text-white border-0 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        {step === 3 ? 'Reveal My Destiny' : 'Continue'}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-secondary-400 to-primary-500"
                    animate={{ x: ['100%', '-100%'] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ opacity: 0.3 }}
                  />
                </Button>
              </div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 pt-6 border-t border-white/10"
              >
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-white/40">
                  <span>🔒 256-bit Encryption</span>
                  <span>✨ 50,000+ Seekers</span>
                  <span>⭐ 4.9/5 Rating</span>
                </div>
              </motion.div>
            </div>
          </Card>

          {/* Mystical Footer */}
          <motion.p
            className="text-center text-white/30 text-sm mt-6"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            "The journey of a thousand miles begins with a single step"
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}