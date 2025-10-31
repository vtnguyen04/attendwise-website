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
import apiClient, { setAuthToken } from '@/lib/api-client';
import React from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { SocialAuthSeparator } from '@/components/ui/social-auth-separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AlertCircle from 'lucide-react/icons/alert-circle';

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
      const response = await apiClient.post('/api/v1/auth/login', values);

      // The API client interceptor now resolves 401s on the login page with an error payload.
      // We must check for this payload to handle login failures.
      if (response.data.error) {
        setApiError('Invalid email or password. Please try again.'); // Hardcoded fix for i18n issue
        setIsLoading(false);
        return;
      }

      const { user, access_token } = response.data;

      setAuthToken(access_token);
      if (user) {
        setUser(user);
      } else {
        // This case handles successful status codes but missing data.
        setApiError('Login successful, but failed to retrieve user data.');
        setIsLoading(false);
        return;
      }
      
      toast({
        title: t('login.success_title'),
        description: t('login.success_description'),
      });
      
      router.push('/dashboard'); 

    } catch (error: any) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        setApiError('Invalid email or password. Please try again.');
      } else {
        console.error('Login failed with unexpected error:', error);
        setApiError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      // This ensures loading is stopped even if we return early on login failure.
      if (isLoading) {
        setIsLoading(false);
      }
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google/login`;
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
  
      <Card className="w-full max-w-md glass-container">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.description')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('login.failed_title')}</AlertTitle>
              <AlertDescription>
                {apiError}
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('login.email_label')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('login.email_placeholder')}
                        {...field}
                        disabled={isLoading}
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
                  <FormItem>
                      <div className="flex items-center justify-between">
                          <FormLabel>{t('login.password_label')}</FormLabel>
                          <Link href="#" className="text-sm font-medium text-primary hover:underline">
                              {t('login.forgot_password_link')}
                          </Link>
                      </div>
                    <FormControl>
                      <PasswordInput {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('login.sign_in_button')}
              </Button>
            </form>
          </Form>
          <SocialAuthSeparator />
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
            {t('login.login_with_google_button')}
          </Button>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p className="w-full">
            {t('login.no_account_text')}{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t('login.sign_up_link')}
            </Link>
          </p>
        </CardFooter>
      </Card>
  );
}