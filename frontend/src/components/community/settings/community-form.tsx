import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from 'react';
import apiClient, { API_BASE_URL } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Community } from '@/lib/types';
import Upload from 'lucide-react/icons/upload';
import Lock from 'lucide-react/icons/lock';
import Globe from 'lucide-react/icons/globe';
import Eye from 'lucide-react/icons/eye';
import Trash2 from 'lucide-react/icons/trash-2';
import { useTheme } from '@/hooks/use-theme'; // 👈 Import hook theme
import { useTranslation } from '@/hooks/use-translation';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Community name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  type: z.enum(['public', 'private', 'secret'], { required_error: 'You need to select a community type.' }),
  allow_member_posts: z.boolean().default(true),
  auto_approve_posts: z.boolean().default(true),
  allow_member_invites: z.boolean().default(false),
});

type CommunityFormValues = z.infer<typeof formSchema>;

interface CommunityFormProps {
  mode?: 'create' | 'edit';
  initialData?: Community;
  onDelete?: () => void;
}

import { getNullableStringValue } from '@/lib/utils';

export default function CommunityForm({ mode = 'create', initialData, onDelete }: CommunityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.cover_image_url?.String
      ? initialData.cover_image_url.String.startsWith('http')
        ? initialData.cover_image_url.String
        : `${API_BASE_URL}${initialData.cover_image_url.String}`
      : null
  );
  const theme = useTheme(); // 👈 Lấy theme hiện tại
  const { t } = useTranslation('communities');

  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'public',
      allow_member_posts: true,
      auto_approve_posts: true,
      allow_member_invites: false,
    },
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.reset({
        name: initialData.name,
        description: getNullableStringValue(initialData.description),
        type: initialData.type,
        allow_member_posts: initialData.allow_member_posts,
        auto_approve_posts: initialData.auto_approve_posts,
        allow_member_invites: initialData.allow_member_invites,
      });
    }
  }, [form, initialData, mode]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function onSubmit(values: CommunityFormValues) {
    setIsLoading(true);
    try {
      let cover_image_url = initialData?.cover_image_url?.String || '';
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadResponse = await apiClient.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        cover_image_url = uploadResponse.data.final_url;
      }

      const payload = { ...values, cover_image_url };

      if (mode === 'edit') {
        await apiClient.patch(`/communities/${initialData?.id}`, payload);
        toast({ title: 'Success', description: 'Community updated successfully.' });
        router.push(`/dashboard/communities/${initialData?.id}`);
      } else {
        const response = await apiClient.post('/communities', payload);
        toast({ title: 'Success', description: 'Community created successfully.' });
        router.push(`/dashboard/communities/${response.data.community.id}`);
      }
      router.refresh();

    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || (error as Error)?.message || 'An unknown error occurred.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto">
        
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('form.basic_information.title')}</CardTitle>
            <CardDescription>{t('form.basic_information.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.name.label')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('form.name.placeholder')} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description.label')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('form.description.placeholder')} 
                      rows={4} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>{t('form.cover_image.label')}</FormLabel>
              <FormControl>
                <label className="relative flex items-center justify-center w-full h-12 px-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <Upload className="h-5 w-5" />
                    <span>{t('form.cover_image.button')}</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </FormControl>
              {previewUrl && (
                <div className="mt-4 rounded-xl overflow-hidden w-full aspect-[16/9] relative border">
                  <Image src={previewUrl} alt="Cover preview" fill className="object-cover" />
                </div>
              )}
              <FormMessage />
            </FormItem>
          </CardContent>
        </Card>

        <Separator className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} />

        {/* Privacy & Permissions Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('form.privacy_and_permissions.title')}</CardTitle>
            <CardDescription>{t('form.privacy_and_permissions.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-base font-semibold">{t('form.type.label')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <FormControl>
                          <RadioGroupItem value="public" className="mt-1" />
                        </FormControl>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            <FormLabel className="text-base font-semibold">{t('form.type.public.label')}</FormLabel>
                          </div>
                          <FormDescription className="mt-1">
                            {t('form.type.public.description')}
                          </FormDescription>
                        </div>
                      </FormItem>

                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <FormControl>
                          <RadioGroupItem value="private" className="mt-1" />
                        </FormControl>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-yellow-500" />
                            <FormLabel className="text-base font-semibold">{t('form.type.private.label')}</FormLabel>
                          </div>
                          <FormDescription className="mt-1">
                            {t('form.type.private.description')}
                          </FormDescription>
                        </div>
                      </FormItem>

                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <FormControl>
                          <RadioGroupItem value="secret" className="mt-1" />
                        </FormControl>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-destructive" />
                            <FormLabel className="text-base font-semibold">{t('form.type.secret.label')}</FormLabel>
                          </div>
                          <FormDescription className="mt-1">
                            {t('form.type.secret.description')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} />

        {/* Content & Member Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('form.content_and_member_settings.title')}</CardTitle>
            <CardDescription>{t('form.content_and_member_settings.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="allow_member_posts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('form.allow_member_posts.label')}</FormLabel>
                    <FormDescription>{t('form.allow_member_posts.description')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_approve_posts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('form.auto_approve_posts.label')}</FormLabel>
                    <FormDescription>{t('form.auto_approve_posts.description')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_member_invites"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('form.allow_member_invites.label')}</FormLabel>
                    <FormDescription>{t('form.allow_member_invites.description')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
          <Button 
            type="button" 
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            {t('form.button.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading} 
            size="lg"
            className="flex-1"
          >
            {isLoading && <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />}
            {mode === 'edit' ? t('form.button.save_changes') : t('form.button.create_community')}
          </Button>
        </div>

                {mode === 'edit' && (
          <>
            <Separator className="bg-destructive/20" />
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">{t('form.danger_zone.title')}</CardTitle>
                <CardDescription className="text-destructive/80">{t('form.danger_zone.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={onDelete}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('form.danger_zone.delete_button')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </form>
    </Form>
  );
}