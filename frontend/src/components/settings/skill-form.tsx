'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import apiClient from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { UserSkill } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useTranslation } from '@/hooks/use-translation';

const skillFormSchema = z.object({
  id: z.string().optional(),
  skill_name: z.string().min(2, "Skill name must be at least 2 characters."),
});

type SkillFormValues = z.infer<typeof skillFormSchema>;

function SkillItem({ skill, onDelete }: { skill: UserSkill, onDelete: () => void }) {
  const { t } = useTranslation('profile');
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-semibold">{skill.skill_name}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={onDelete}>{t('skills_delete_button')}</Button>
      </div>
    </div>
  )
}

export default function SkillForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation('profile');
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: { skill_name: '' },
  });

  useEffect(() => {
    if (user) {
      apiClient.get<{ skills: UserSkill[] }>(`/users/${user.id}/skills`).then(response => {
        setSkills(response.data.skills || []);
      });
    }
  }, [user]);

  async function onSubmit(data: SkillFormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const response = await apiClient.post(`/users/${user.id}/skills`, data);
      const newSkill = response.data?.skill;
      if (newSkill) {
        setSkills([...skills, newSkill]);
      }
      toast({ title: t('skills_add_success_toast_title'), description: t('skills_add_success_toast_description') });
      setIsDialogOpen(false);
    } catch {
      toast({ title: t('skills_add_error_toast_title'), description: t('skills_add_error_toast_description'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(skillId: string) {
    if (!user) return;

    try {
      await apiClient.delete(`/users/${user.id}/skills/${skillId}`);
      setSkills(skills.filter(skill => skill.id !== skillId));
      toast({ title: 'Success', description: 'Skill deleted successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete skill.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('skills_title')}</h3>
          <p className="text-sm text-muted-foreground">{t('skills_description')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t('skills_add_button')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('skills_add_button')}</DialogTitle>
              <DialogDescription>
                Add a new skill to your profile.
              </DialogDescription>
            </DialogHeader>
            <FormProvider {...form}>
              <form id="skill-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="skill_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('skills_form_skill_name_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('skills_form_skill_name_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </FormProvider>
            <DialogFooter>
              <Button type="submit" form="skill-form" disabled={isSubmitting}>
                {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />} {t('skills_add_button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {skills.length > 0 ? (
        <div className="space-y-4">
          {skills.map(skill => (
            <SkillItem 
              key={skill.id} 
              skill={skill} 
              onDelete={() => onDelete(skill.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You have not added any skills yet.</p>
      )}
    </div>
  );
}
