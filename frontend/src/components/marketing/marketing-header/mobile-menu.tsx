// components/layout/marketing-header/mobile-menu.tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import UserNav from '@/components/layout/user-nav';

interface NavLink {
  name: string;
  href: string;
}

interface MobileMenuProps {
  navLinks: NavLink[];
  closeMenu: () => void;
}

const mobileMenuVariants = {
  closed: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } },
  open: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const mobileMenuItemVariants = {
  closed: { opacity: 0, x: -20 },
  open: { opacity: 1, x: 0 },
};

export function MobileMenu({ navLinks, closeMenu }: MobileMenuProps) {
  return (
    <motion.div
      className="fixed inset-0 z-40 md:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
        onClick={closeMenu}
      />
      <motion.div
        className="container absolute top-20 left-0 right-0 mx-auto px-4 py-8"
        variants={mobileMenuVariants}
        initial="closed"
        animate="open"
        exit="closed"
      >
        <nav className="space-y-2">
          {navLinks.map((link) => (
            <motion.div key={link.name} variants={mobileMenuItemVariants}>
              <Link
                href={link.href}
                onClick={closeMenu}
                className="group block rounded-xl bg-white/5 p-4 transition-colors duration-300 hover:bg-white/10"
              >
                <span className="text-lg font-semibold text-white group-hover:text-purple-300">
                  {link.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </nav>
        <motion.div
          variants={mobileMenuItemVariants}
          className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <UserNav theme="marketing" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}