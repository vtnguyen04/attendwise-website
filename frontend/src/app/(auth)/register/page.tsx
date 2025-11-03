'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import React, { useEffect, useState } from 'react';
import apiClient, { API_BASE_URL } from '@/lib/api-client';
import Image from 'next/image';
import { useTranslation } from '@/hooks/use-translation';
import { SocialAuthSeparator } from '@/components/ui/social-auth-separator';

const formSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    company: z.string().optional(),
    position: z.string().optional(),
    email: z.string()
      .email('Please enter a valid email address.')
      .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      company: '',
      position: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      let profilePictureUrl = '';

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await apiClient.post('api/v1/media/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        profilePictureUrl = response.data.final_url;
      }

      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        company: values.company,
        position: values.position,
        profile_picture_url: profilePictureUrl,
      };

      await apiClient.post('api/v1/auth/register', payload);

      toast({
        title: t('auth.register.success_title'),
        description: t('auth.register.success_description'),
      });

      router.push('/login');

    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || (error as Error).message || 'An unknown error occurred.';
      console.error('Registration error:', error);
      toast({
        title: t('auth.register.failed_title'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/dashboard`;
      window.location.href = `${API_BASE_URL}/auth/google/login?callback_url=${encodeURIComponent(callbackUrl)}`;
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: 'Error',
        description: 'Could not initiate Google login. Please try again later.',
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card className="relative w-full overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-0 shadow-[0_25px_60px_rgba(8,15,31,0.45)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_70%)]" />
      <div className="relative z-10 flex flex-col gap-6 px-6 pb-6 pt-8 sm:px-8 sm:pt-10">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icons.logo className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-white">
              {t('auth.register.title')}
            </CardTitle>
            <CardDescription className="text-sm text-slate-300">
              {t('auth.register.description')}
            </CardDescription>
          </div>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <CardContent className="grid gap-4 p-0">
              <FormItem className="flex flex-col items-center gap-3">
                <FormLabel className="text-sm font-medium text-white">
                  {t('auth.register.profile_picture_label')}
                </FormLabel>
                <FormControl>
                  <label htmlFor="file-upload" className="group relative cursor-pointer">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/25 bg-white/10 text-slate-300 transition-all duration-300 group-hover:border-primary/60 group-hover:text-white">
                      {previewUrl ? (
                        <Image
                          src={previewUrl}
                          alt="Profile preview"
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Icons.user className="h-8 w-8" />
                      )}
                    </div>
                    <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                  </label>
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-white">
                      {t('auth.register.name_label')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.register.name_placeholder')}
                        {...field}
                        className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-white">
                        {t('auth.register.company_label')} <span className="text-xs text-slate-400">({t('common.optional')})</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.register.company_placeholder')}
                          {...field}
                          className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-white">
                        {t('auth.register.position_label')} <span className="text-xs text-slate-400">({t('common.optional')})</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.register.position_placeholder')}
                          {...field}
                          className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-white">
                      {t('auth.register.email_label')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('auth.register.email_placeholder')}
                        {...field}
                        className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-white">
                        {t('auth.register.password_label')}
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-white">
                        {t('auth.register.confirm_password_label')}
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 p-0">
              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-primary text-base font-semibold hover:bg-primary/90"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.register.create_account_button')}
              </Button>

              <SocialAuthSeparator text={t('auth.register.social_auth_separator')} />

              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border border-white/15 bg-transparent text-white hover:border-white/25"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
                {t('auth.register.sign_up_with_google_button')}
              </Button>

              <p className="text-center text-sm text-slate-400">
                {t('auth.register.already_have_account_text')}{' '}
                <Link href="/login" className="font-semibold text-primary hover:text-primary/80">
                  {t('auth.register.sign_in_link')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </div>
    </Card>
  );
}
