'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';

const formSchema = z.object({
  content: z.string().min(1, { message: 'Post content cannot be empty.' }),
});

type EditPostFormValues = z.infer<typeof formSchema>;

interface EditPostModalProps {
  post: Post;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPostUpdated: (updatedPost: Post) => void;
}

export function EditPostModal({ post, isOpen, onOpenChange, onPostUpdated }: EditPostModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditPostFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ content: post.content });
    }
  }, [isOpen, post, form]);

  const onSubmit = async (values: EditPostFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiClient.patch(`/api/v1/posts/${post.id}`, values);
      toast({ title: 'Success', description: 'Post updated successfully.' });
      onPostUpdated(response.data.post);
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update post.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} rows={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
