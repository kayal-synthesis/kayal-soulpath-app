'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Users, Calendar, X, Clock } from 'lucide-react'

export const EnrollConsultWidget = () => {
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showConsultModal, setShowConsultModal] = useState(false)

  const ComingSoonModal = ({ 
    isOpen, 
    onClose, 
    title 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string 
  }) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <h3 className="text-xl font-serif text-neutral-800 mb-2">Coming Soon</h3>
            <p className="text-sm text-neutral-600 mb-6">
              {title} will be available soon! We're working on bringing you the best guidance experience.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-amber-600 text-white py-3 rounded-xl hover:bg-amber-700 transition font-medium"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
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
          {/* Stats Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-neutral-600">12 experts available</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-neutral-600">Today's slots</span>
            </div>
          </div>

          {/* Two Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => window.open('https://kayalsoulpath.com/courses', '_blank')}
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
              onClick={() => window.open('https://kayalsoulpath.com/consultation', '_blank')}
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

          {/* Free Discovery Note - LARGER FONT */}
          <p className="text-xs text-neutral-500 text-center">
            Free 15-min discovery call available
          </p>
        </div>
      </motion.div>

      {/* Coming Soon Modals */}
      <ComingSoonModal 
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Enroll Seekers"
      />
      <ComingSoonModal 
        isOpen={showConsultModal}
        onClose={() => setShowConsultModal(false)}
        title="Consultation"
      />
    </>
  )
}