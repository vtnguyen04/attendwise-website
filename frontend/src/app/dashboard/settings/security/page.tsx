'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import { useUser } from '@/context/user-provider';
import apiClient from '@/lib/api-client';
import { useState } from 'react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import FaceEnrollmentDialog from '@/components/settings/face-enrollment-dialog';
import { PasswordInput } from '@/components/ui/password-input';
import { TwoFactorAuthDialog, DangerZoneCard } from '@/components/settings/security-enhancements';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { GlassCard } from '@/components/ui/glass-card';
import { useTranslation } from '@/hooks/use-translation';

const passwordFormSchema = z.object({
  oldPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: `New passwords don\'t match`,
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function SecuritySettingsPage() {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation('settings');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isFaceEnrollmentOpen, setIsFaceEnrollmentOpen] = useState(false);
  const [isTwoFactorOpen, setIsTwoFactorOpen] = useState(false);
  const [isDeletingFaceData, setIsDeletingFaceData] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsSavingPassword(true);
    try {
      await apiClient.post('api/v1/users/change-password', {
        old_password: data.oldPassword,
        new_password: data.newPassword,
      });
      toast({ title: t('security.password.success_title'), description: t('security.password.success_description') });
      passwordForm.reset();
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || t('security.password.error_description');
      toast({ title: t('security.password.error_title'), description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSavingPassword(false);
    }
  }

  const handleDeleteFaceData = async () => {
    setIsDeletingFaceData(true);
    try {
      // Mock API call for now, as endpoint doesn't exist
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      // In a real app: await apiClient.delete('/users/me/face-embedding');
      
      // Update frontend state
      if (user) {
        setUser({ 
          ...user, 
          face_id_enrolled: false, 
          face_id_consent_given: false, 
          face_id_consent_time: null, 
          face_samples_count: 0 
        });
      }
      toast({ title: t('security.face_id.delete_success_title'), description: t('security.face_id.delete_success_description') });
    } catch {
      toast({ title: t('security.face_id.delete_error_title'), description: t('security.face_id.delete_error_description'), variant: 'destructive' });
    } finally {
      setIsDeletingFaceData(false);
    }
  };

  useEffect(() => {
    console.log('[SecuritySettingsPage] User context received:', user);
  }, [user]);

  const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());
  return (
    <div className="space-y-8" data-scroll-anchor>
      {/* Password Section */}
      <GlassCard data-scroll-anchor>
        <CardHeader>
          <CardTitle>{t('security.password.title')}</CardTitle>
          <CardDescription>{t('security.password.description')}</CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.password.current')}</FormLabel>
                    <FormControl><PasswordInput {...field} className="liquid-glass-input" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.password.new')}</FormLabel>
                    <FormControl><PasswordInput {...field} className="liquid-glass-input" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.password.confirm')}</FormLabel>
                    <FormControl><PasswordInput {...field} className="liquid-glass-input" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSavingPassword} className="liquid-glass-button">
                {isSavingPassword && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('security.password.save')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </GlassCard>

      {/* Face ID Section */}
      <Dialog open={isFaceEnrollmentOpen} onOpenChange={setIsFaceEnrollmentOpen}>
        <GlassCard>
          <CardHeader>
            <CardTitle>{t('security.face_id_title')}</CardTitle>
            <CardDescription>{t('security.face_id_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('security.face_id.status_label')}</span>
                    <span className="text-sm">
                        {user?.face_id_enrolled ? t('security.face_id.status_enabled') : t('security.face_id.status_disabled')}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('security.face_id.consent_label')}</span>
                    <span className="text-sm">
                        {user?.face_id_consent_given ? t('security.face_id.consent_yes') : t('security.face_id.consent_no')}
                    </span>
                </div>
                {user?.face_id_consent_time && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('security.face_id.consent_time')}</span>
                        <span className="text-sm">
                            {(() => {
                                const date = new Date(user.face_id_consent_time.Time);
                                return isValidDate(date) ? format(date, 'PPP p') : t('security.face_id.enrolled_unknown');
                            })()}
                        </span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('security.face_id.samples_label')}</span>
                    <span className="text-sm">
                        {user?.face_samples_count || 0}
                    </span>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <DialogTrigger asChild>
                    <Button className="flex-1 liquid-glass-button">{user?.face_id_enrolled ? t('security.re_enroll_button') : t('security.enroll_now_button')}</Button>
                </DialogTrigger>
                {user?.face_id_enrolled && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="flex-1 liquid-glass-button bg-destructive" disabled={isDeletingFaceData}>{t('security.face_id.delete_button')}</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('security.face_id.delete_confirm_title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('security.face_id.delete_confirm_description')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('security.face_id.delete_cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteFaceData} disabled={isDeletingFaceData}>
                                    {isDeletingFaceData && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('security.face_id.delete_confirm_action')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
          </CardContent>
        </GlassCard>
        <FaceEnrollmentDialog open={isFaceEnrollmentOpen} onOpenChange={setIsFaceEnrollmentOpen} />
      </Dialog>

      {/* Two-Factor Authentication Section */}
       <Dialog open={isTwoFactorOpen} onOpenChange={setIsTwoFactorOpen}>
        <GlassCard>
            <CardHeader>
                <CardTitle>{t('security.two_factor.title')}</CardTitle>
                <CardDescription>{t('security.two_factor.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                    <p className="text-sm font-medium">{t('security.two_factor.method_app')}</p>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{t('security.two_factor.status_disabled')}</span>
                        <DialogTrigger asChild>
                            <Button className="liquid-glass-button">{t('security.two_factor.enable_button')}</Button>
                        </DialogTrigger>
                    </div>
                </div>
            </CardContent>
        </GlassCard>
        <TwoFactorAuthDialog />
      </Dialog>

      {/* Danger Zone */}
      <DangerZoneCard />

    </div>
  );
}
