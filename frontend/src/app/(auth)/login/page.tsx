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
import { useUser } from '@/context/user-provider';
import apiClient, { API_BASE_URL, setAuthToken } from '@/lib/api-client';
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { SocialAuthSeparator } from '@/components/ui/social-auth-separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AlertCircle from 'lucide-react/icons/alert-circle';

import Cookies from 'js-cookie';

const formSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(1, {
    message: 'Password is required.',
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUser } = useUser();
  const { t } = useTranslation('auth');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await apiClient.post('/auth/login', values);

      if (response.data.error) {
        setApiError('Invalid email or password. Please try again.');
        return;
      }

      const { user, access_token } = response.data;

      setAuthToken(access_token);
      if (user) {
        setUser(user);
      } else {
        setApiError('Login successful, but failed to retrieve user data.');
        return;
      }

      toast({
        title: t('login.success_title'),
        description: t('login.success_description'),
      });

      router.push('/dashboard');
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response && (((error as { response?: { status?: number } })?.response?.status === 401) || ((error as { response?: { status?: number } })?.response?.status === 403))) {
        setApiError('Invalid email or password. Please try again.');
      } else {
        console.error('Login failed with unexpected error:', error);
        setApiError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      const state = Math.random().toString(36).substring(2);
      Cookies.set('oauthstate', state, { expires: 1/144, sameSite: 'lax' }); // Expires in 10 minutes
      const callbackUrl = `${window.location.origin}/dashboard`;
      window.location.href = `${API_BASE_URL}/auth/google/login?callback_url=${encodeURIComponent(callbackUrl)}&state=${state}`;
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

  if (!mounted) {
    return (
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-0 shadow-[0_25px_60px_rgba(8,15,31,0.45)] backdrop-blur-2xl">
        <div className="h-[600px] w-full" />
      </div>
    );
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
              {t('login.title')}
            </CardTitle>
            <CardDescription className="text-sm text-slate-300">
              {t('login.description')}
            </CardDescription>
          </div>
        </CardHeader>

        {apiError && (
          <Alert variant="destructive" className="border border-red-400/20 bg-red-500/10 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('login.failed_title')}</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <CardContent className="p-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-white">
                      {t('login.email_label')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('login.email_placeholder')}
                        {...field}
                        disabled={isLoading}
                        className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium text-white">
                        {t('login.password_label')}
                      </FormLabel>
                      <Link href="#" className="text-xs font-semibold text-primary hover:text-primary/80">
                        {t('login.forgot_password_link')}
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        disabled={isLoading}
                        className="h-12 rounded-2xl border border-white/10 bg-white/10 text-base text-white placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-primary text-base font-semibold hover:bg-primary/90"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('login.sign_in_button')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <div className="space-y-4">
          <SocialAuthSeparator />
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border border-white/15 bg-transparent text-white hover:border-white/25"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
            {t('login.login_with_google_button')}
          </Button>
        </div>

        <CardFooter className="justify-center p-0 text-center text-sm text-slate-400">
          <p>
            {t('login.no_account_text')}{' '}
            <Link href="/register" className="font-semibold text-primary hover:text-primary/80">
              {t('login.sign_up_link')}
            </Link>
          </p>
        </CardFooter>
      </div>
    </Card>
  );
}