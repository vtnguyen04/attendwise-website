// components/layout/marketing-header/marketing-logo.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';

export function MarketingLogo() {
  return (
    <motion.div whileHover={{ scale: 1.05 }}>
      <Link href="/" className="group flex items-center gap-2.5">
        <motion.div whileHover={{ rotate: 12, scale: 1.1 }}>
          <Image src="/apple-touch-icon.png" alt="AttendWise Logo" width={32} height={32} className="rounded-md" />
        </motion.div>
        <span className="text-xl font-black tracking-tight text-white transition-colors duration-300 group-hover:text-purple-300">
          AttendWise
        </span>
      </Link>
    </motion.div>
  );
}