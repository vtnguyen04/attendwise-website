// components/layout/marketing-header/mobile-menu-toggle.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface MobileMenuToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function MobileMenuToggle({ isOpen, onClick }: MobileMenuToggleProps) {
  return (
    <motion.button
      onClick={onClick}
      className="relative z-50 rounded-lg border border-white/10 bg-white/5 p-2 transition-colors duration-300 hover:bg-white/10 md:hidden"
      aria-label="Toggle menu"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={isOpen ? 'x' : 'menu'}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Menu className="h-5 w-5 text-white" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}