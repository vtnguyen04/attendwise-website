'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Star from 'lucide-react/icons/star';
import { UserSkill } from '@/lib/types';

import { useTranslation } from '@/hooks/use-translation';

interface UserSkillsProps {
  skills: UserSkill[];
  isOwnProfile?: boolean;
}

export default function UserSkills({ skills, isOwnProfile = false }: UserSkillsProps) {
  const { t } = useTranslation('user_profile');

  if (skills.length === 0) {
    return (
      <Card className="border border-border/60 bg-glass-gradient-dark shadow-glass backdrop-blur">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Star className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {isOwnProfile ? t('add_first_skill') : t('no_skills')}
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isOwnProfile
                ? t('add_first_skill_desc')
                : t('no_skills_desc')}
            </p>
          </div>
          {isOwnProfile && (
            <Button asChild className="rounded-full px-5">
              <a href="/dashboard/settings">{t('add_skills')}</a>
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
          <span className="text-xl font-semibold text-foreground">{t('skills')}</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs caps-label text-primary">
            {skills.length} {skills.length === 1 ? t('skill') : t('skills')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <div key={skill.id} className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground/95">{skill.skill_name}</span>
            {skill.endorsement_count > 0 && (
              <span className="text-xs text-muted-foreground">({skill.endorsement_count})</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
