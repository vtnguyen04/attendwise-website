'use client';

import { useState, useRef } from 'react';
import { useUser } from '@/context/user-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ImageIcon from 'lucide-react/icons/image';
import Paperclip from 'lucide-react/icons/paperclip';
import Loader2 from 'lucide-react/icons/loader-2';
import X from 'lucide-react/icons/x';
import File from 'lucide-react/icons/file';
import Send from 'lucide-react/icons/send';
import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronUp from 'lucide-react/icons/chevron-up';

const FileIcon = File;
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';

interface PostComposerProps {
    communityId?: string;
    onPostCreated?: () => void;
}

interface MediaFile {
    url: string;
    name: string;
    type: string;
}

export function PostComposer({ communityId, onPostCreated }: PostComposerProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = () => imageInputRef.current?.click();
    const handleFileSelect = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        const uploadPromises = Array.from(files).map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await apiClient.post("/api/v1/media/upload", formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return { 
                    url: response.data.final_url, 
                    name: file.name, 
                    type: file.type 
                };
            } catch (error) {
                console.error(`File upload failed for ${file.name}:`, error);
                toast({ title: `Upload Failed for ${file.name}`, description: "Could not upload the file.", variant: "destructive" });
                return null;
            }
        });

        try {
            const results = await Promise.all(uploadPromises);
            const successfulUploads = results.filter((result): result is MediaFile => result !== null);
            if (successfulUploads.length > 0) {
                setMediaFiles(prev => [...prev, ...successfulUploads]);
                toast({ title: "Success", description: `${successfulUploads.length} file(s) uploaded successfully.` });
            }
        } finally {
            setIsUploading(false);
            if(imageInputRef.current) imageInputRef.current.value = '';
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveMedia = (urlToRemove: string) => {
        setMediaFiles(prev => prev.filter(file => file.url !== urlToRemove));
    };

    const handleSubmit = async () => {
        if ((!content.trim() && mediaFiles.length === 0) || !user) return;

        setIsSubmitting(true);
        try {
            const url = communityId 
                ? `/api/v1/communities/${communityId}/posts` 
                : `/api/v1/feed/posts`;

            const response = await apiClient.post(url, {
                content: content,
                file_attachments: mediaFiles,
            });

            const newPost = response.data.post;

            if (newPost.status === 'approved') {
                toast({ title: 'Success', description: 'Your post is now live.' });
                onPostCreated?.();
                queryClient.invalidateQueries({ queryKey: ['feed'] });
                queryClient.invalidateQueries({ queryKey: ['posts', 'user', user.id] });
            } else {
                toast({ title: 'Post Submitted', description: 'Your post is pending approval by an admin.' });
            }
            setContent('');
            setMediaFiles([]);
            setIsExpanded(false);
        } catch (error) {
            console.error('Failed to create post', error);
            toast({ title: 'Error', description: 'Could not create your post. Please try again.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const imageFiles = mediaFiles.filter(f => f.type.startsWith('image/'));
    const otherFiles = mediaFiles.filter(f => !f.type.startsWith('image/'));

    return (
        <>
            {user && (
                <div className="bg-glass-interactive w-full">
                    {/* Header - Always visible */}
                    <div 
                        className="px-4 sm:px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                                <AvatarImage 
                                    src={user?.profile_picture_url || ''} 
                                    alt={user?.name || 'User Avatar'} 
                                />
                                <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {user?.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isExpanded ? 'Writing...' : 'What\'s on your mind?'}
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            className="flex-shrink-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8"
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Expandable Content - Auto-collapse after submit */}
                    {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 space-y-3">
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind?"
                                className="w-full liquid-glass-input resize-none text-sm"
                                rows={3}
                            />

                            {/* Media Previews */}
                            {(imageFiles.length > 0 || otherFiles.length > 0) && (
                                <div className="space-y-2 py-2 border-t border-gray-200 dark:border-gray-700">
                                    {/* Images Grid */}
                                    {imageFiles.length > 0 && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {imageFiles.map(file => (
                                                <div key={file.url} className="relative group aspect-square">
                                                    <Image 
                                                        src={file.url} 
                                                        alt={file.name} 
                                                        layout="fill" 
                                                        className="rounded-lg object-cover border border-gray-200 dark:border-gray-700" 
                                                    />
                                                    <Button 
                                                        variant="destructive" 
                                                        size="icon" 
                                                        className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-md text-xs" 
                                                        onClick={() => handleRemoveMedia(file.url)}
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Files List */}
                                    {otherFiles.length > 0 && (
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {otherFiles.map(file => (
                                                <div 
                                                    key={file.url} 
                                                    className="bg-gray-50 dark:bg-gray-800/30 rounded-lg px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 text-xs"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded flex-shrink-0">
                                                            <FileIcon className="h-3 w-3 text-blue-600 dark:text-blue-400"/>
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 flex-shrink-0 rounded" 
                                                        onClick={() => handleRemoveMedia(file.url)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions Bar */}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex gap-0.5">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={handleImageSelect} 
                                        disabled={isUploading}
                                        className="rounded h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        title="Add images"
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={handleFileSelect} 
                                        disabled={isUploading}
                                        className="rounded h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        title="Add files"
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
                                    className="liquid-glass-button text-white font-medium text-sm px-4 py-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                            Posting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-1.5 h-3 w-3" />
                                            Post
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Hidden file inputs */}
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
                </div>
            )}
        </>
    );
}