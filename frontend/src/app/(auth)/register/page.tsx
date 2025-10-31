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
import React, { useState } from 'react';
import apiClient from '@/lib/api-client';
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
  const { t } = useTranslation('auth');
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
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

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
        title: t('register.success_title'),
        description: t('register.success_description'),
      });

      router.push('/login');

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
      console.error('Registration error:', error);
      toast({
        title: t('register.failed_title'),
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
      <Card className="w-full max-w-lg glass-container">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
              <CardDescription>{t('register.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormItem className="flex flex-col items-center">
                <FormLabel>{t('register.profile_picture_label')}</FormLabel>
                <FormControl>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary">
                      {previewUrl ? (
                        <Image src={previewUrl} alt="Profile preview" width={96} height={96} className="rounded-full object-cover w-full h-full" />
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
                  <FormItem>
                    <FormLabel>{t('register.name_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('register.name_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.company_label')} <span className="text-muted-foreground">({t('common.optional')})</span></FormLabel>
                      <FormControl>
                        <Input placeholder={t('register.company_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.position_label')} <span className="text-muted-foreground">({t('common.optional')})</span></FormLabel>
                      <FormControl>
                        <Input placeholder={t('register.position_placeholder')} {...field} />
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
                  <FormItem>
                    <FormLabel>{t('register.email_label')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('register.email_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.password_label')}</FormLabel>
                      <FormControl>
                        <PasswordInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.confirm_password_label')}</FormLabel>
                      <FormControl>
                        <PasswordInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('register.create_account_button')}
              </Button>
              
              <SocialAuthSeparator text={t('register.social_auth_separator')} />

              <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading || isGoogleLoading}>
                {isGoogleLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
                {t('register.sign_up_with_google_button')}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                {t('register.already_have_account_text')}{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  {t('register.sign_in_link')}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}