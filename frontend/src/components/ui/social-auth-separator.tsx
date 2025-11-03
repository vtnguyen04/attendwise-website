'use client';

import { useTranslation } from "@/hooks/use-translation";

export function SocialAuthSeparator({ text }: { text?: string }) {
    const { t } = useTranslation();
    const translatedText = text || t('common.social.auth.separator');

    return (
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{translatedText}</span>
        </div>
      </div>
    );
  }