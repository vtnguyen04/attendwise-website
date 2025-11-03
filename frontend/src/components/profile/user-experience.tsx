'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Briefcase from 'lucide-react/icons/briefcase';
import type { UserExperience } from '@/lib/types';
import { getNullableStringValue } from '@/lib/utils';
import { format } from 'date-fns';

import { useTranslation } from '@/hooks/use-translation';

interface UserExperienceProps {
  experience: UserExperience[];
  isOwnProfile?: boolean;
}

export default function UserExperience({ experience, isOwnProfile = false }: UserExperienceProps) {
  const { t } = useTranslation('user_profile');

  if (experience.length === 0) {
    return (
      <Card className="border border-border/60 bg-glass-gradient-dark shadow-glass backdrop-blur">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {isOwnProfile ? t('add_first_experience') : t('no_experience')}
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isOwnProfile
                ? t('add_first_experience_desc')
                : t('no_experience_desc')}
            </p>
          </div>
          {isOwnProfile && (
            <Button asChild className="rounded-full px-5">
              <a href="/dashboard/settings">{t('add_experience')}</a>
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
          <span className="text-xl font-semibold text-foreground">{t('experience')}</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs caps-label text-primary">
            {experience.length} {experience.length === 1 ? t('entry') : t('entries')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {experience.map((exp) => (
          <div key={exp.id} className="flex gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground/95">{exp.title}</p>
              <p className="text-sm text-muted-foreground">{exp.company} · {getNullableStringValue(exp.location)}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(exp.start_date), 'MMM yyyy')} - {' '}
                {exp.end_date.Valid ? format(new Date(exp.end_date.Time), 'MMM yyyy') : t('present')}
              </p>
              {exp.description.Valid && <p className="text-sm text-foreground/80 pt-2">{exp.description.String}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
