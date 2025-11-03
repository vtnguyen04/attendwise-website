'use client';

import { Button, ButtonProps } from '@/components/ui/button';
import Link from 'next/link';
import { useUser } from '@/context/user-provider';
import Loader2 from 'lucide-react/icons/loader-2';
import Sparkles from 'lucide-react/icons/sparkles';
import { useTranslation } from '@/hooks/use-translation';

interface GetStartedButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

export default function GetStartedButton({ children, className, ...props }: GetStartedButtonProps) {
  const { user, isLoading } = useUser();
  const { t } = useTranslation('marketing');

  // Loading state
  if (isLoading) {
    return (
      <Button 
        disabled 
        className={`relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 ${className}`}
        {...props}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="ml-2">{t('loading')}</span>
      </Button>
    );
  }

  const href = '/dashboard';
  const buttonText = children || (user ? t('go_to_dashboard') : t('get_started'));

  return (
    <Button 
      asChild 
      className={`group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 bg-[length:200%_100%] hover:bg-right transition-all duration-500 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 transform hover:scale-105 ${className}`}
      {...props}
    >
      <Link href={href}>
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        
        {/* Sparkle Effect */}
        <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
        
        {/* Button Text */}
        <span className="relative z-10 font-semibold">
          {buttonText}
        </span>

        {/* Pulse Ring on Hover */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 rounded-lg bg-white/20 animate-ping" />
        </div>
      </Link>
    </Button>
  );
}
