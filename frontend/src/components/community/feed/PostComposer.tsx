'use client';

import { useState, useRef } from 'react';
import Image from 'next/image'; // Import the Next.js Image component
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Paperclip, Loader2, X, File, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/services/feed.client.service';
import { useQueryClient } from '@tanstack/react-query';
import { Post } from '@/lib/types';
import { uploadFile } from '@/lib/services/media.service';

interface PostComposerProps {
    communityId?: string;
    onPostCreated?: (post: Post) => void;
}

interface MediaFile {
    url: string;
    name: string;
    type: string;
}

export function PostComposer({ communityId, onPostCreated }: PostComposerProps) {
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { user } = useUser();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const handleImageSelect = () => imageInputRef.current?.click();
    const handleFileSelect = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        const uploadedUrls: MediaFile[] = [];
        for (const file of Array.from(files)) {
            try {
                const url = await uploadFile(file);
                uploadedUrls.push({ url, name: file.name, type: file.type });
                toast({ title: 'Upload successful', description: `File ${file.name} uploaded.` });
            } catch (error: unknown) {
                console.error("Upload error:", error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to upload files.';
                toast({ title: 'Upload error', description: errorMessage, variant: 'destructive' });
            }
        }

        setMediaFiles(prev => [...prev, ...uploadedUrls]);
        setIsUploading(false);
        if(imageInputRef.current) imageInputRef.current.value = '';
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveMedia = (urlToRemove: string) => {
        setMediaFiles(prev => prev.filter(file => file.url !== urlToRemove));
    };

    const handleSubmit = async () => {
        if ((!content.trim() && mediaFiles.length === 0)) return;
        
        setIsSubmitting(true);

        try {
            const newPost = await createPost(title, content, mediaFiles, communityId);
            
            // Post-submission logic
            setContent('');
            setTitle('');
            setMediaFiles([]);
            setIsExpanded(false);
            toast({ title: 'Success', description: 'Your post has been created.' });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            onPostCreated?.(newPost);

        } catch (error) {
            console.error("Failed to create post:", error);
            toast({ title: 'Error', description: 'Failed to create post. Please try again.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const imageFiles = mediaFiles.filter(f => f.type.startsWith('image/'));
    const otherFiles = mediaFiles.filter(f => !f.type.startsWith('image/'));

    return (
        <Card className="w-full border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader 
                className="flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg p-4"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-border">
                        <AvatarImage 
                            src={user?.profile_picture_url || undefined} 
                            alt={user?.name || 'User Avatar'} 
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm text-foreground">
                            {user?.name}
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                            {isExpanded ? 'Đang viết bài...' : 'Bạn đang nghĩ gì?'}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted/50"
                >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
            </CardHeader>

            {isExpanded && (
                <>
                    <Separator className="bg-border/50" />
                    <CardContent className="pt-4 space-y-4 p-4">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Tiêu đề bài viết (Tùy chọn)"
                            className="text-sm border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Chia sẻ suy nghĩ của bạn..."
                            className="resize-none text-sm min-h-[100px] border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            rows={4}
                        />

                        {(imageFiles.length > 0 || otherFiles.length > 0) && (
                            <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                                {imageFiles.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <ImageIcon className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-medium text-foreground">
                                                Hình ảnh ({imageFiles.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {imageFiles.map(file => (
                                                <div key={file.url} className="relative group aspect-square">
                                                    {/* Replaced <img> with next/image <Image /> for optimization */}
                                                    <Image 
                                                        src={file.url} 
                                                        alt={file.name}
                                                        fill
                                                        className="rounded-lg object-cover border-2 border-border/50" 
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                                                    <Button 
                                                        variant="destructive"
                                                        size="icon" 
                                                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-full shadow-lg"
                                                        onClick={() => handleRemoveMedia(file.url)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherFiles.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <File className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-medium text-foreground">
                                                File đính kèm ({otherFiles.length})
                                            </span>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {otherFiles.map(file => (
                                                <div 
                                                    key={file.url} 
                                                    className="bg-background rounded-lg px-3 py-2.5 flex items-center justify-between border-2 border-border/50 hover:border-primary/50 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <File className="h-4 w-4 text-primary"/>
                                                        </div>
                                                        <p className="text-sm text-foreground truncate font-medium">{file.name}</p>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive flex-shrink-0" 
                                                        onClick={() => handleRemoveMedia(file.url)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <Separator className="bg-border/50" />

                        <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleImageSelect} 
                                    disabled={isUploading}
                                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <ImageIcon className="h-4 w-4 mr-2" />
                                    )}
                                    Hình ảnh
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleFileSelect} 
                                    disabled={isUploading}
                                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Paperclip className="h-4 w-4 mr-2" />
                                    )}
                                    File
                                </Button>
                            </div>
                            <Button 
                                onClick={handleSubmit} 
                                disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
                                className="px-6 shadow-sm hover:shadow-md transition-all"
                                size="sm"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang đăng...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Đăng bài
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </>
            )}

            <Input 
                ref={imageInputRef} 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
            />
            <Input 
                ref={fileInputRef} 
                type="file" 
                multiple 
                onChange={handleFileChange} 
                className="hidden" 
            />
        </Card>
    );
}