'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface AccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Accordion({ title, children, defaultOpen = false, className = '' }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`border border-white/20 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 transition-all duration-300 flex items-center justify-between text-left group"
      >
        <span className="text-white font-semibold text-sm sm:text-base tracking-wide group-hover:text-yellow-400 transition-colors">
          {title}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="text-white/70 group-hover:text-yellow-400 transition-colors"
        >
          <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 sm:py-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
