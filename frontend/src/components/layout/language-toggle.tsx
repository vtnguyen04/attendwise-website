// ./src/components/layout/language-toggle.tsx
'use client';

// 1. Import component Image từ next/image
import Image from 'next/image';
import { useEffect, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/context/i18n-provider';
import { useTranslation } from '@/hooks/use-translation';

const VNM_FLAG_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/vn.svg';
const USA_FLAG_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/us.svg';

export default function LanguageToggle() {
  const [mounted, setMounted] = useState(false);
  const { locale, setLocale } = useI18n();
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full bg-muted" />;
  }

  const currentFlag = locale === 'vi' ? VNM_FLAG_URL : USA_FLAG_URL;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          {/* 2. Thay thế <img> bằng <Image> và thêm width/height */}
          <Image
            src={currentFlag}
            alt={locale}
            width={24} // tương đương với w-6
            height={24} // tương đương với h-6
            className="rounded-full object-cover"
          />
          <span className="sr-only">{t('common.language.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale('en')}>
          {/* 3. Thay thế <img> bằng <Image> và thêm width/height */}
          <Image
            src={USA_FLAG_URL}
            alt={t('common.language.english')}
            width={16} // tương đương với w-4
            height={16} // tương đương với h-4
            className="mr-2"
          />
          {t('common.language.english')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('vi')}>
          {/* 4. Thay thế <img> bằng <Image> và thêm width/height */}
          <Image
            src={VNM_FLAG_URL}
            alt={t('common.language.vietnamese')}
            width={16} // tương đương với w-4
            height={16} // tương đương với h-4
            className="mr-2"
          />
          {t('common.language.vietnamese')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}