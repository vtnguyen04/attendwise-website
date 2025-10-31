
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';

import UserNav from '@/components/layout/user-nav';
import Menu from 'lucide-react/icons/menu';
import X from 'lucide-react/icons/x';

export default function MarketingHeader() {

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '#' },
    { name: 'About', href: '#' },
    { name: 'Contact', href: '#' },
  ];

  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      transition: { staggerChildren: 0.05, staggerDirection: -1 },
    },
    open: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const mobileMenuItemVariants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 },
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-purple-500/5'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          {/* Logo */}
          <motion.div whileHover={{ scale: 1.05 }}>
            <Link href="/" className="group flex items-center gap-2.5 relative z-10">
              <motion.div whileHover={{ rotate: 12, scale: 1.1 }}>
                <Icons.logo className="relative h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-all duration-300" />
              </motion.div>
              <span className="text-xl font-black tracking-tight text-white group-hover:text-purple-300 transition-colors duration-300">
                AttendWise
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="group relative text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300"
              >
                {link.name}
                <motion.span
                  className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400"
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* User Nav */}
            <div className="hidden md:block">
              <UserNav theme="marketing" />
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
              aria-label="Toggle menu"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={isMobileMenuOpen ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5 text-white" />
                  ) : (
                    <Menu className="w-5 h-5 text-white" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Content */}
            <motion.div
              className="absolute top-20 left-0 right-0"
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div className="container mx-auto px-4 py-8">
                <nav className="space-y-2">
                  {navLinks.map((link) => (
                    <motion.div key={link.name} variants={mobileMenuItemVariants}>
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="group block p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 transition-all duration-300"
                      >
                        <span className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {link.name}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Mobile User Nav */}
                <motion.div variants={mobileMenuItemVariants} className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <UserNav theme="marketing" />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}