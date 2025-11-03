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
import { UserEducation } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useTranslation } from '@/hooks/use-translation';

const educationFormSchema = z.object({
  id: z.string().optional(),
  school: z.string().min(2, "School must be at least 2 characters."),
  degree: z.string().optional(),
  field_of_study: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().max(500).optional(),
});

type EducationFormValues = z.infer<typeof educationFormSchema>;

function EducationItem({ education, onEdit, onDelete }: { education: UserEducation, onEdit: () => void, onDelete: () => void }) {
  const { t } = useTranslation('profile');
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-semibold">{education.school}</p>
        <p className="text-sm text-muted-foreground">{education.degree.String} in {education.field_of_study.String}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>{t('education_edit_button')}</Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>{t('education_delete_button')}</Button>
      </div>
    </div>
  )
}

export default function EducationForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation('profile');
  const [educations, setEducations] = useState<UserEducation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<UserEducation | null>(null);

  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
  });

  useEffect(() => {
    if (user) {
      apiClient.get<{ education: UserEducation[] }>(`/users/${user.id}/education`).then(response => {
        setEducations(response.data.education || []);
      });
    }
  }, [user]);

  useEffect(() => {
    if (editingEducation) {
      form.reset({
        id: editingEducation.id,
        school: editingEducation.school,
        degree: editingEducation.degree.String,
        field_of_study: editingEducation.field_of_study.String,
        start_date: editingEducation.start_date.Time.split('T')[0],
        end_date: editingEducation.end_date.Time.split('T')[0],
        description: editingEducation.description.String,
      });
    } else {
      form.reset({ school: '', degree: '', field_of_study: '', start_date: '', end_date: '', description: '' });
    }
  }, [editingEducation, form]);

  async function onSubmit(data: EducationFormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      if (editingEducation) {
        // Update existing education
        const response = await apiClient.put(`/users/${user.id}/education/${editingEducation.id}`, data);
        const updatedEducation = response.data?.education;
        if (updatedEducation) {
          setEducations(educations.map(edu => edu.id === updatedEducation.id ? updatedEducation : edu));
        }
        toast({ title: 'Success', description: 'Education updated successfully.' });
      } else {
        // Add new education
        const response = await apiClient.post(`/users/${user.id}/education`, data);
        const newEducation = response.data?.education;
        if (newEducation) {
          setEducations([...educations, newEducation]);
        }
        toast({ title: t('education_add_success_toast_title'), description: t('education_add_success_toast_description') });
      }
      setIsDialogOpen(false);
      setEditingEducation(null);
    } catch {
      toast({ title: t('education_add_error_toast_title'), description: t('education_add_error_toast_description'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(educationId: string) {
    if (!user) return;

    try {
      await apiClient.delete(`/users/${user.id}/education/${educationId}`);
      setEducations(educations.filter(edu => edu.id !== educationId));
      toast({ title: 'Success', description: 'Education deleted successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete education.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('education_title')}</h3>
          <p className="text-sm text-muted-foreground">{t('education_description')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingEducation(null)}>{t('education_add_button')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEducation ? 'Edit Education' : t('education_add_button')}</DialogTitle>
              <DialogDescription>
                {editingEducation ? 'Update your education history.' : 'Add a new education entry to your profile.'}
              </DialogDescription>
            </DialogHeader>
            <FormProvider {...form}>
              <form id="education-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('education_form_school_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('education_form_school_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="degree"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('education_form_degree_label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('education_form_degree_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="field_of_study"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('education_form_field_of_study_label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('education_form_field_of_study_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('education_form_start_date_label')}</FormLabel>
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
                        <FormLabel>{t('education_form_end_date_label')}</FormLabel>
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
                      <FormLabel>{t('education_form_description_label')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('education_form_description_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </FormProvider>
            <DialogFooter>
              <Button type="submit" form="education-form" disabled={isSubmitting}>
                {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />} {editingEducation ? 'Save Changes' : t('education_add_button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {educations.length > 0 ? (
        <div className="space-y-4">
          {educations.map(edu => (
            <EducationItem 
              key={edu.id} 
              education={edu} 
              onEdit={() => { setEditingEducation(edu); setIsDialogOpen(true); }} 
              onDelete={() => onDelete(edu.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You have not added any education history yet.</p>
      )}
    </div>
  );
}
