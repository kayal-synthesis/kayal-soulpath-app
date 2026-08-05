'use client'

import { motion } from 'framer-motion'
import { Sparkles, Users, Clock } from 'lucide-react'

export const EnrollConsultWidget = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden"
    >
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white" />
          <h3 className="text-sm font-medium text-white">Grow Your Journey</h3>
        </div>
        <p className="text-xs text-white/80 mt-1">Deepen your practice with expert guidance</p>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Two Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.open('https://kayalsoulpath.com/pages/courses/index.html', '_blank', 'noopener,noreferrer')}
            className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 p-[1px] hover:shadow-lg transition-all"
          >
            <div className="relative rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white transition-all group-hover:bg-gradient-to-r group-hover:from-amber-600 group-hover:to-orange-600">
              <span className="text-sm font-medium flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Enroll Seekers
              </span>
            </div>
          </button>

          <button
            onClick={() => window.open('https://kayalsoulpath.com/consultation.html', '_blank', 'noopener,noreferrer')}
            className="group relative overflow-hidden rounded-lg border-2 border-amber-500 hover:shadow-lg transition-all"
          >
            <div className="rounded-lg bg-white px-4 py-3 text-amber-600 transition-all group-hover:bg-amber-50">
              <span className="text-sm font-medium flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Consultation
              </span>
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
