"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { Post, Comment } from "@/lib/types";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNullableStringValue } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/context/user-provider";

interface PostDetailPageProps {
  params: Promise<{ postId: string }>; // params is now a Promise
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = React.use(params); // Unwrap the Promise
  const { postId } = resolvedParams;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPostDetails = useCallback(async () => {
    setLoadingPost(true);
    try {
      const response = await apiClient.get(`/api/v1/posts/${postId}`);
      setPost(response.data.post);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch post details.",
        variant: "destructive",
      });
      setPost(null);
    } finally {
      setLoadingPost(false);
    }
  }, [postId, toast]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const response = await apiClient.get(`/api/v1/posts/${postId}/comments`);
      setComments(response.data.comments || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch comments.",
        variant: "destructive",
      });
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [postId, toast]);

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
      fetchComments();
    }
  }, [postId, fetchPostDetails, fetchComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim() || !postId) return;

    setSubmittingComment(true);
    try {
      await apiClient.post(`/api/v1/posts/${postId}/comments`, {
        content: newCommentContent,
      });
      setNewCommentContent("");
      toast({ title: "Success", description: "Comment added successfully." });
      fetchComments(); // Refresh comments
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Icons.spinner className="mr-2 h-8 w-8 animate-spin inline-block" />
        <p className="text-muted-foreground">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold text-destructive">Post Not Found</h1>
        <p className="text-muted-foreground">The post you are looking for does not exist or has been removed.</p>
        <Button onClick={() => router.back()} className="liquid-glass-button mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <GlassCard className="p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-12 w-12 shadow-glass">
            <AvatarImage src={getNullableStringValue(post.author.profile_picture_url) || undefined} />
            <AvatarFallback>{post.author.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{post.author.name}</p>
            <p className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-glow mb-4">Post Content</h1>
        <p className="text-foreground leading-relaxed mb-6">{post.content}</p>

        {/* Post Actions (Edit/Delete) - Conditional based on user role/ownership */}
        {user?.id === post.author_id && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="liquid-glass-button">
              <Icons.edit className="mr-2 h-4 w-4" /> Edit Post
            </Button>
            <Button variant="destructive" size="sm" className="liquid-glass-button">
              <Icons.delete className="mr-2 h-4 w-4" /> Delete Post
            </Button>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-glow mb-4">Comments</h2>
        <form onSubmit={handleAddComment} className="mb-6">
          <Textarea
            placeholder="Add a comment..."
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            className="liquid-glass-input mb-2"
            rows={3}
            disabled={submittingComment}
          />
          <Button type="submit" disabled={submittingComment} className="liquid-glass-button">
            {submittingComment && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Add Comment
          </Button>
        </form>

        {loadingComments ? (
          <p className="text-center text-muted-foreground">
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin inline-block" /> Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <GlassCard key={comment.id} className="p-4 liquid-glass-card">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8 shadow-glass">
                    <AvatarImage src={getNullableStringValue(comment.author.profile_picture_url) || undefined} />
                    <AvatarFallback>{comment.author.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{comment.author.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
