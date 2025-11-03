// components/layout/dashboard-header/header-logo.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';

export function HeaderLogo() {
  return (
    <div className="flex items-center gap-3">
      <MobileSidebar />
      <Link
        href="/"
        className="hidden items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary md:flex"
      >
        <Image src="/apple-touch-icon.png" alt="AttendWise Logo" width={24} height={24} className="rounded-md" />
        AttendWise
      </Link>
    </div>
  );
}