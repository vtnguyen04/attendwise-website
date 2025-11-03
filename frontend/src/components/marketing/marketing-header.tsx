// components/layout/marketing-header.tsx
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useTheme as useCustomTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

import { MarketingLogo } from './marketing-header/marketing-logo';
import { DesktopNav } from './marketing-header/desktop-nav';
import { HeaderActions } from './marketing-header/header-actions';
import { MobileMenu } from './marketing-header/mobile-menu';
import { MobileMenuToggle } from './marketing-header/mobile-menu-toggle';

const SCROLL_THRESHOLD = 20;

const navLinks = [
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export default function MarketingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { setTheme } = useTheme();
  const currentTheme = useCustomTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  return (
    <>
      <header
        className={cn(
                  'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
                  isScrolled
                    ? 'border-b border-white/10 bg-slate-950/80 shadow-lg shadow-purple-500/5 backdrop-blur-xl'
                    : 'bg-transparent'        )}
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <MarketingLogo />
          <DesktopNav navLinks={navLinks} />
          <div className="flex items-center gap-2">
            <HeaderActions theme={currentTheme} toggleTheme={toggleTheme} />
            <MobileMenuToggle isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu navLinks={navLinks} closeMenu={() => setIsMobileMenuOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}