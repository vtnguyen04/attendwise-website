'use client';

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
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Community } from '@/lib/types';
import Upload from 'lucide-react/icons/upload';
import Lock from 'lucide-react/icons/lock';
import Globe from 'lucide-react/icons/globe';
import Eye from 'lucide-react/icons/eye';
import Trash2 from 'lucide-react/icons/trash-2';
import { useTheme } from '@/hooks/use-theme'; // 👈 Import hook theme

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.cover_image_url?.String || null);
  const theme = useTheme(); // 👈 Lấy theme hiện tại

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
        const uploadResponse = await apiClient.post('/api/v1/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        cover_image_url = uploadResponse.data.final_url;
      }

      const payload = { ...values, cover_image_url };

      if (mode === 'edit') {
        await apiClient.patch(`/api/v1/communities/${initialData?.id}`, payload);
        toast({ title: 'Success', description: 'Community updated successfully.' });
        router.push(`/dashboard/communities/${initialData?.id}`);
      } else {
        const response = await apiClient.post('/api/v1/communities', payload);
        toast({ title: 'Success', description: 'Community created successfully.' });
        router.push(`/dashboard/communities/${response.data.community.id}`);
      }
      router.refresh();

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An unknown error occurred.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto">
        
        {/* Basic Information Section */}
        <div className="space-y-6">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Basic Information</h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Tell us about your community</p>
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="bg-glass p-4 rounded-lg">
                <FormLabel className="text-base font-semibold">Community Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g. AttendWise Developer Network" 
                    {...field} 
                    className="liquid-glass-input"
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
              <FormItem className="bg-glass p-4 rounded-lg">
                <FormLabel className="text-base font-semibold">Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="What is your community about? Share your community's mission and values..." 
                    rows={4} 
                    {...field} 
                    className="liquid-glass-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cover Image */}
          <FormItem className="bg-glass p-4 rounded-lg">
            <FormLabel className="text-base font-semibold">Cover Image (Optional)</FormLabel>
            <FormControl>
              <label className="relative flex items-center justify-center w-full h-12 px-4 liquid-glass-button cursor-pointer">
                <div className="flex items-center gap-2 font-semibold">
                  <Upload className="h-5 w-5" />
                  <span>Choose File</span>
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
              <div className={`mt-4 rounded-xl overflow-hidden w-full aspect-[16/9] relative border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <Image src={previewUrl} alt="Cover preview" fill className="object-cover" />
              </div>
            )}
            <FormMessage />
          </FormItem>
        </div>

        <Separator className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} />

        {/* Privacy & Permissions Section */}
        <div className="space-y-6">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Privacy & Permissions</h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Choose who can access and join your community</p>
          </div>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-4 bg-glass p-4 rounded-lg">
                <FormLabel className="text-base font-semibold">Community Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="space-y-3"
                  >
                    {/* Public */}
                    <FormItem className="flex items-start space-x-3 space-y-0 glass-card p-4 rounded-xl transition-colors bg-glass-interactive">
                      <FormControl>
                        <RadioGroupItem value="public" className="mt-1" />
                      </FormControl>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Globe className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                          <FormLabel className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Public</FormLabel>
                        </div>
                        <FormDescription className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Anyone can find, view content, and join this community.
                        </FormDescription>
                      </div>
                    </FormItem>

                    {/* Private */}
                    <FormItem className="flex items-start space-x-3 space-y-0 glass-card p-4 rounded-xl transition-colors bg-glass-interactive">
                      <FormControl>
                        <RadioGroupItem value="private" className="mt-1" />
                      </FormControl>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Eye className={`h-5 w-5 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                          <FormLabel className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Private</FormLabel>
                        </div>
                        <FormDescription className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Anyone can find it, but must be approved to view content and join.
                        </FormDescription>
                      </div>
                    </FormItem>

                    {/* Secret */}
                    <FormItem className="flex items-start space-x-3 space-y-0 glass-card p-4 rounded-xl transition-colors bg-glass-interactive">
                      <FormControl>
                        <RadioGroupItem value="secret" className="mt-1" />
                      </FormControl>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Lock className={`h-5 w-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                          <FormLabel className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Secret</FormLabel>
                        </div>
                        <FormDescription className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Only people with a direct invite link can find and join the community.
                        </FormDescription>
                      </div>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} />

        {/* Content & Member Settings Section */}
        <div className="space-y-6">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Content & Member Settings</h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Control what members can do in your community</p>
          </div>

          <FormField
            control={form.control}
            name="allow_member_posts"
            render={({ field }) => (
              <FormItem className="bg-glass flex flex-row items-center justify-between rounded-xl p-5 transition-colors">
                <div className="space-y-1">
                  <FormLabel className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Allow Member Posts</FormLabel>
                  <FormDescription>Allow all community members to create new posts.</FormDescription>
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
              <FormItem className="bg-glass flex flex-row items-center justify-between rounded-xl p-5 transition-colors">
                <div className="space-y-1">
                  <FormLabel className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Auto-Approve Posts</FormLabel>
                  <FormDescription>Automatically approve all new posts from members.</FormDescription>
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
              <FormItem className="bg-glass flex flex-row items-center justify-between rounded-xl p-5 transition-colors">
                <div className="space-y-1">
                  <FormLabel className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Allow Member Invites</FormLabel>
                  <FormDescription>Allow members to invite others to this community.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
          <Button 
            type="button" 
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            className="w-full sm:w-auto liquid-glass-button"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading} 
            size="lg"
            className="flex-1 liquid-glass-button"
          >
            {isLoading && <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />}
            {mode === 'edit' ? 'Save Changes' : 'Create Community'}
          </Button>
        </div>

        {mode === 'edit' && (
          <>
            <Separator className="bg-red-500/20" />
            <div className="bg-glass space-y-4 rounded-xl p-6">
              <div>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Danger Zone</h3>
                <p className={`mt-1 ${theme === 'dark' ? 'text-red-400/80' : 'text-red-600/80'}`}>These actions are irreversible. Please be certain.</p>
              </div>
              <Button 
                type="button" 
                variant="destructive"
                onClick={onDelete}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete this community
              </Button>
            </div>
          </>
        )}
      </form>
    </Form>
  );
}