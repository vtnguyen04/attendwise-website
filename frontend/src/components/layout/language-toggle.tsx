'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/context/i18n-provider';

const VNM_FLAG_URL = 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/vn.svg';
const USA_FLAG_URL = 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/us.svg';

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  const currentFlag = locale === 'vi' ? VNM_FLAG_URL : USA_FLAG_URL;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <img src={currentFlag} alt={locale} className="h-6 w-6 rounded-full object-cover" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale('en')}>
          <img src={USA_FLAG_URL} alt="English" className="h-4 w-4 mr-2" />
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('vi')}>
          <img src={VNM_FLAG_URL} alt="Vietnamese" className="h-4 w-4 mr-2" />
          Tiếng Việt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
