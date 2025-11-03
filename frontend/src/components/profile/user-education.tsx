'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GraduationCap from 'lucide-react/icons/graduation-cap';
import type { UserEducation } from '@/lib/types';
import { getNullableStringValue } from '@/lib/utils';
import { format } from 'date-fns';

import { useTranslation } from '@/hooks/use-translation';

interface UserEducationProps {
  education: UserEducation[];
  isOwnProfile?: boolean;
}

export default function UserEducation({ education, isOwnProfile = false }: UserEducationProps) {
  const { t } = useTranslation('user_profile');

  if (education.length === 0) {
    return (
      <Card className="border border-border/60 bg-glass-gradient-dark shadow-glass backdrop-blur">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {isOwnProfile ? t('add_first_education') : t('no_education')}
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isOwnProfile
                ? t('add_first_education_desc')
                : t('no_education_desc')}
            </p>
          </div>
          {isOwnProfile && (
            <Button asChild className="rounded-full px-5">
              <a href="/dashboard/settings">{t('add_education')}</a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 bg-glass-gradient-dark shadow-glass backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="text-xl font-semibold text-foreground">{t('education')}</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs caps-label text-primary">
            {education.length} {education.length === 1 ? t('entry') : t('entries')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {education.map((edu) => (
          <div key={edu.id} className="flex gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground/95">{edu.school}</p>
              <p className="text-sm text-muted-foreground">{getNullableStringValue(edu.degree)} · {getNullableStringValue(edu.field_of_study)}</p>
              <p className="text-xs text-muted-foreground">
                {edu.start_date.Valid ? format(new Date(edu.start_date.Time), 'MMM yyyy') : ''} - {' '}
                {edu.end_date.Valid ? format(new Date(edu.end_date.Time), 'MMM yyyy') : t('present')}
              </p>
              {edu.description.Valid && <p className="text-sm text-foreground/80 pt-2">{edu.description.String}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
