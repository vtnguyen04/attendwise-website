'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";
import { useEffect, useState } from "react";
import type { Community } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { UploadCloud, ImagePlus, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  cover_image_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

export function GeneralSettingsTab({ communityId }: { communityId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const theme = useTheme();
  const [, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", cover_image_url: "" },
  });

  useEffect(() => {
    if (!communityId) return;
    const fetchCommunity = async () => {
      try {
        const response = await apiClient.get(`/communities/${communityId}`);
        const fetchedCommunity = response.data.community;
        setCommunity(fetchedCommunity);
        form.reset({
          name: fetchedCommunity.name,
          description: fetchedCommunity.description,
          cover_image_url: fetchedCommunity.cover_image_url || ''
        });
      } catch {
        toast({ 
          title: "Error", 
          description: "Failed to fetch community details.", 
          variant: "destructive" 
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunity();
  }, [communityId, form, toast]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Please upload an image smaller than 5MB.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload an image file.", 
        variant: "destructive" 
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const presignedUrlResponse = await apiClient.post("/media/upload", {
        file_name: file.name,
        content_type: file.type,
      });
      const { upload_url, final_url } = presignedUrlResponse.data;

      await axios.put(upload_url, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
      });

      form.setValue("cover_image_url", final_url, { shouldValidate: true });
      toast({ 
        title: "Success", 
        description: "Image uploaded successfully." 
      });

    } catch (error) {
      console.error(error);
      toast({ 
        title: "Upload Failed", 
        description: "Could not upload the image.", 
        variant: "destructive" 
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    form.setValue("cover_image_url", "", { shouldValidate: true });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await apiClient.patch(`/communities/${communityId}`, values);
      toast({ 
        title: "Success", 
        description: "Community details updated successfully." 
      });
      router.refresh();
    } catch {
      toast({ 
        title: "Error", 
        description: "Failed to update community.", 
        variant: "destructive" 
      });
    }
  }

  if (isLoading) {
    return (
      <Card className={cn(
        "border transition-colors duration-200",
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader className="pb-3">
          <Skeleton className={cn(
            "h-6 w-48",
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
          )} />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className={cn(
              "h-3 w-16",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )} />
            <Skeleton className={cn(
              "h-9 w-full",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )} />
          </div>
          <div className="space-y-2">
            <Skeleton className={cn(
              "h-3 w-24",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )} />
            <Skeleton className={cn(
              "h-24 w-full",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )} />
          </div>
          <div className="space-y-2">
            <Skeleton className={cn(
              "h-3 w-20",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )} />
            <Skeleton className={cn(
              "h-40 w-full",
              theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentCoverUrl = previewUrl || form.watch("cover_image_url") || null;

  return (
    <Card className={cn(
      "border transition-all duration-300 transform-gpu",
      "hover:shadow-lg hover:-translate-y-0.5",
      theme === 'dark' 
        ? 'bg-slate-900 border-slate-800 hover:shadow-slate-950/50' 
        : 'bg-white border-slate-200 hover:shadow-slate-200/50'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          "text-base font-semibold",
          theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
        )}>
          General Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-[13px] font-medium",
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  )}>
                    Community Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter community name..."
                      {...field}
                      className={cn(
                        "h-9 text-[13px] transition-all duration-200",
                        "transform-gpu hover:scale-[1.01] focus:scale-[1.01]",
                        "hover:shadow-sm focus:shadow-md",
                        theme === 'dark'
                          ? 'bg-slate-950 border-slate-800 placeholder:text-slate-600 hover:border-slate-700'
                          : 'bg-white border-slate-200 placeholder:text-slate-400 hover:border-slate-300'
                      )}
                    />
                  </FormControl>
                  <FormDescription className={cn(
                    "text-[11px]",
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                  )}>
                    This is the public display name of your community
                  </FormDescription>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-[13px] font-medium",
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  )}>
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your community..."
                      {...field}
                      rows={4}
                      className={cn(
                        "resize-none text-[13px] transition-all duration-200",
                        "transform-gpu hover:scale-[1.005] focus:scale-[1.005]",
                        "hover:shadow-sm focus:shadow-md",
                        theme === 'dark'
                          ? 'bg-slate-950 border-slate-800 placeholder:text-slate-600 hover:border-slate-700'
                          : 'bg-white border-slate-200 placeholder:text-slate-400 hover:border-slate-300'
                      )}
                    />
                  </FormControl>
                  <FormDescription className={cn(
                    "text-[11px]",
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                  )}>
                    A brief description that appears on your community page
                  </FormDescription>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Cover Image Field */}
            <FormItem>
              <FormLabel className={cn(
                "text-[13px] font-medium",
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              )}>
                Cover Image
              </FormLabel>
              <FormControl>
                <div 
                  className={cn(
                    "group relative w-full aspect-[21/9] rounded-lg border-2 border-dashed overflow-hidden transition-all duration-300",
                    "transform-gpu perspective-1000",
                    isUploading && "pointer-events-none",
                    theme === 'dark'
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-950'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50',
                    !isUploading && "hover:scale-[1.01] hover:shadow-xl hover:-translate-y-0.5"
                  )}
                  onMouseMove={(e) => {
                    if (isUploading) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = (y - centerY) / 20;
                    const rotateY = (centerX - x) / 20;
                    e.currentTarget.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01) translateY(-2px)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1) translateY(0)';
                  }}
                >
                  {currentCoverUrl ? (
                    <>
                      <Image 
                        src={currentCoverUrl} 
                        alt="Cover image preview" 
                        fill 
                        className="object-cover"
                      />
                      {!isUploading && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById('cover-image-input')?.click();
                            }}
                            className={cn(
                              "h-8 text-[12px] transition-all duration-200",
                              "transform-gpu hover:scale-110 active:scale-95",
                              "hover:shadow-lg"
                            )}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const y = e.clientY - rect.top;
                              const centerX = rect.width / 2;
                              const centerY = rect.height / 2;
                              const rotateX = (y - centerY) / 8;
                              const rotateY = (centerX - x) / 8;
                              e.currentTarget.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.1)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'perspective(400px) rotateX(0) rotateY(0) scale(1)';
                            }}
                          >
                            <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                            Change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage();
                            }}
                            className={cn(
                              "h-8 text-[12px] transition-all duration-200",
                              "transform-gpu hover:scale-110 active:scale-95",
                              "hover:shadow-lg"
                            )}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const y = e.clientY - rect.top;
                              const centerX = rect.width / 2;
                              const centerY = rect.height / 2;
                              const rotateX = (y - centerY) / 8;
                              const rotateY = (centerX - x) / 8;
                              e.currentTarget.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.1)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'perspective(400px) rotateX(0) rotateY(0) scale(1)';
                            }}
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 p-6">
                      <div className={cn(
                        "p-3 rounded-full",
                        theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
                      )}>
                        <UploadCloud className={cn(
                          "h-8 w-8",
                          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                        )} />
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-[13px] font-medium",
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        )}>
                          Click to upload or drag and drop
                        </p>
                        <p className={cn(
                          "text-[11px] mt-1",
                          theme === 'dark' ? 'text-slate-600' : 'text-slate-500'
                        )}>
                          PNG, JPG or WEBP (max. 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                  <Input
                    id="cover-image-input"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
              </FormControl>
              
              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={cn(
                      "font-medium",
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      Uploading...
                    </span>
                    <span className={cn(
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                    )}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress 
                    value={uploadProgress} 
                    className={cn(
                      "h-1",
                      theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                    )}
                  />
                </div>
              )}
              
              <FormDescription className={cn(
                "text-[11px]",
                theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
              )}>
                Recommended size: 2100×900px for best display quality
              </FormDescription>
              <FormMessage className="text-[11px]" />
            </FormItem>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                disabled={isUploading || form.formState.isSubmitting}
                className={cn(
                  "h-9 px-4 text-[13px] font-medium transition-all duration-300",
                  "transform-gpu hover:scale-105 active:scale-95",
                  "hover:shadow-lg",
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 shadow-slate-900/50'
                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-300/50'
                )}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const rotateX = (y - centerY) / 10;
                  const rotateY = (centerX - x) / 10;
                  e.currentTarget.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'perspective(500px) rotateX(0) rotateY(0) scale(1)';
                }}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}