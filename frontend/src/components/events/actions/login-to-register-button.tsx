// components/events/actions/login-to-register-button.tsx
'use client';

import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import Link from 'next/link';

export function LoginToRegisterButton() {
  return (
    <Button asChild className="w-full">
      <Link href="/login">
        <LogIn className="w-4 h-4 mr-2" />
        Login to Register
      </Link>
    </Button>
  );
}