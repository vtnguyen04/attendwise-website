// components/layout/marketing-header/desktop-nav.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface NavLink {
  name: string;
  href: string;
}

export function DesktopNav({ navLinks }: { navLinks: NavLink[] }) {
  return (
    <nav className="hidden md:flex items-center gap-8">
      {navLinks.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className="group relative text-sm font-medium text-gray-300 transition-colors duration-300 hover:text-white"
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
  );
}