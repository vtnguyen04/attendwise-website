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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import apiClient from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { UserExperience } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useTranslation } from '@/hooks/use-translation';

const experienceFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Title must be at least 2 characters."),
  company: z.string().min(2, "Company must be at least 2 characters."),
  location: z.string().optional(),
  start_date: z.string().min(1, "Start date is required."),
  end_date: z.string().optional(),
  description: z.string().max(500).optional(),
});

type ExperienceFormValues = z.infer<typeof experienceFormSchema>;

function ExperienceItem({ experience, onEdit, onDelete }: { experience: UserExperience, onEdit: () => void, onDelete: () => void }) {
  const { t } = useTranslation('profile');
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-semibold">{experience.title} at {experience.company}</p>
        <p className="text-sm text-muted-foreground">{experience.start_date} - {experience.end_date.Valid ? experience.end_date.Time : 'Present'}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>{t('experience_edit_button')}</Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>{t('experience_delete_button')}</Button>
      </div>
    </div>
  )
}

export default function ExperienceForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation('profile');
  const [experiences, setExperiences] = useState<UserExperience[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<UserExperience | null>(null);

  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceFormSchema),
  });

  useEffect(() => {
    if (user) {
      apiClient.get<{ experience: UserExperience[] }>(`/users/${user.id}/experience`).then(response => {
        setExperiences(response.data.experience || []);
      });
    }
  }, [user]);

  useEffect(() => {
    if (editingExperience) {
      form.reset({
        id: editingExperience.id,
        title: editingExperience.title,
        company: editingExperience.company,
        location: editingExperience.location.String,
        start_date: editingExperience.start_date.split('T')[0],
        end_date: editingExperience.end_date.Time.split('T')[0],
        description: editingExperience.description.String,
      });
    } else {
      form.reset({ title: '', company: '', location: '', start_date: '', end_date: '', description: '' });
    }
  }, [editingExperience, form]);

  async function onSubmit(data: ExperienceFormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      if (editingExperience) {
        // Update existing experience
        const response = await apiClient.put(`/users/${user.id}/experience/${editingExperience.id}`, data);
        const updatedExperience = response.data?.experience;
        if (updatedExperience) {
          setExperiences(experiences.map(exp => exp.id === updatedExperience.id ? updatedExperience : exp));
        }
        toast({ title: 'Success', description: 'Experience updated successfully.' });
      } else {
        // Add new experience
        const response = await apiClient.post(`/users/${user.id}/experience`, data);
        const newExperience = response.data?.experience;
        if (newExperience) {
          setExperiences([...experiences, newExperience]);
        }
        toast({ title: t('experience_add_success_toast_title'), description: t('experience_add_success_toast_description') });
      }
      setIsDialogOpen(false);
      setEditingExperience(null);
    } catch {
      toast({ title: t('experience_add_error_toast_title'), description: t('experience_add_error_toast_description'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(experienceId: string) {
    if (!user) return;

    try {
      await apiClient.delete(`/users/${user.id}/experience/${experienceId}`);
      setExperiences(experiences.filter(exp => exp.id !== experienceId));
      toast({ title: 'Success', description: 'Experience deleted successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete experience.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('experience_title')}</h3>
          <p className="text-sm text-muted-foreground">{t('experience_description')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingExperience(null)}>{t('experience_add_button')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExperience ? 'Edit Experience' : t('experience_add_button')}</DialogTitle>
              <DialogDescription>
                {editingExperience ? 'Update your work experience.' : 'Add a new work experience to your profile.'}
              </DialogDescription>
            </DialogHeader>
            <FormProvider {...form}>
              <form id="experience-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('experience_form_title_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('experience_form_title_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('experience_form_company_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('experience_form_company_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('experience_form_location_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('experience_form_location_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('experience_form_start_date_label')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('experience_form_end_date_label')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('experience_form_description_label')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('experience_form_description_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </FormProvider>
            <DialogFooter>
              <Button type="submit" form="experience-form" disabled={isSubmitting}>
                {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />} {editingExperience ? 'Save Changes' : t('experience_add_button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {experiences.length > 0 ? (
        <div className="space-y-4">
          {experiences.map(exp => (
            <ExperienceItem 
              key={exp.id} 
              experience={exp} 
              onEdit={() => { setEditingExperience(exp); setIsDialogOpen(true); }} 
              onDelete={() => onDelete(exp.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You have not added any work experience yet.</p>
      )}
    </div>
  );
}