'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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

const passwordFormSchema = z.object({
  oldPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function SecuritySettingsPage() {
  const { user, setUser } = useUser();
  const { toast } = useToast();
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
      toast({ title: 'Password Updated', description: 'Your password has been successfully changed.' });
      passwordForm.reset();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'An unexpected error occurred.';
      toast({ title: 'Update Failed', description: errorMessage, variant: 'destructive' });
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
      toast({ title: 'Face Data Deleted', description: 'Your Face ID data has been removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete Face ID data.', variant: 'destructive' });
    } finally {
      setIsDeletingFaceData(false);
    }
  };

  useEffect(() => {
    console.log('[SecuritySettingsPage] User context received:', user);
  }, [user]);

  const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());
  return (
    <div className="space-y-8">
      {/* Password Section */}
      <GlassCard>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password here. It's recommended to use a strong, unique password.</CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
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
                    <FormLabel>New Password</FormLabel>
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
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl><PasswordInput {...field} className="liquid-glass-input" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSavingPassword} className="liquid-glass-button">
                {isSavingPassword && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Save Password
              </Button>
            </CardFooter>
          </form>
        </Form>
      </GlassCard>

      {/* Face ID Section */}
      <Dialog open={isFaceEnrollmentOpen} onOpenChange={setIsFaceEnrollmentOpen}>
        <GlassCard>
          <CardHeader>
            <CardTitle>Face ID</CardTitle>
            <CardDescription>Manage your Face ID for secure, passwordless event check-ins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <span className="text-sm">
                        {user?.face_id_enrolled ? 'Enabled' : 'Not Enabled'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Consent Given:</span>
                    <span className="text-sm">
                        {user?.face_id_consent_given ? 'Yes' : 'No'}
                    </span>
                </div>
                {user?.face_id_consent_time && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Consent Time:</span>
                        <span className="text-sm">
                            {(() => {
                                const date = new Date(user.face_id_consent_time.Time);
                                return isValidDate(date) ? format(date, 'PPP p') : 'Invalid Date';
                            })()}
                        </span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Samples Stored:</span>
                    <span className="text-sm">
                        {user?.face_samples_count || 0}
                    </span>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <DialogTrigger asChild>
                    <Button className="flex-1 liquid-glass-button">{user?.face_id_enrolled ? 'Re-enroll' : 'Enroll Now'}</Button>
                </DialogTrigger>
                {user?.face_id_enrolled && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="flex-1 liquid-glass-button bg-destructive" disabled={isDeletingFaceData}>Delete Face Data</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to delete your Face ID data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will permanently delete your stored face data. You will need to re-enroll to use Face ID features again.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteFaceData} disabled={isDeletingFaceData}>
                                    {isDeletingFaceData && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                    Delete
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
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an additional layer of security to your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                    <p className="text-sm font-medium">Authenticator App</p>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Disabled</span>
                        <DialogTrigger asChild>
                            <Button className="liquid-glass-button">Enable</Button>
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
