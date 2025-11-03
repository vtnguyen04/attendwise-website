// ./src/components/profile/user-posts-modal.tsx

import React, { useState, useEffect, useCallback } from "react";
import { User, Post, Comment } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";
import { GlassCard } from "@/components/ui/glass-card";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: User;
  selectedCommunityId: string;
  currentUserId?: string;
  currentUserRole?: 'community_admin' | 'moderator' | 'member' | 'pending';
}

export default function UserPostsModal({
  isOpen,
  onClose,
  member,
  selectedCommunityId,
  currentUserId,
  currentUserRole,
}: UserPostsModalProps) {
  const { toast } = useToast();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postComments, setPostComments] = useState<Map<string, Comment[]>>(new Map());
  const [commentsLoadingState, setCommentsLoadingState] = useState<Map<string, boolean>>(new Map());
  const [commentsVisibleState, setCommentsVisibleState] = useState<Map<string, boolean>>(new Map());

  const postsHasMoreRef = React.useRef(postsHasMore);
  postsHasMoreRef.current = postsHasMore;

  const canManagePost = (post: Post) => {
    const isAuthor = post.author_id === currentUserId;
    const isAdminOrModerator = currentUserRole === 'community_admin' || currentUserRole === 'moderator';
    return isAuthor || isAdminOrModerator;
  };

  const canApproveRejectPost = () => {
    return currentUserRole === 'community_admin' || currentUserRole === 'moderator';
  };

  const fetchUserPostsInCommunity = useCallback(async (page: number) => {
    if (!selectedCommunityId || !member.id || (!postsHasMoreRef.current && page > 1)) return;

    setPostsLoading(true);
    try {
      const limit = 5;
      const offset = (page - 1) * limit;
      const response = await apiClient.get(
        `/communities/${selectedCommunityId}/posts/user/${member.id}`,
        { params: { limit, offset } }
      );
      setUserPosts(prev => page === 1 ? (response.data.posts || []) : [...prev, ...(response.data.posts || [])]);
      setPostsHasMore(response.data.posts.length === limit);
    } catch { // ✅ Đã sửa: Xóa (error)
      toast({
        title: "Error",
        description: "Failed to fetch user posts.",
        variant: "destructive",
      });
      setUserPosts([]);
      setPostsHasMore(false);
    } finally {
      setPostsLoading(false);
    }
  }, [selectedCommunityId, member.id, toast]);

  const fetchCommentsForPost = useCallback(async (postId: string) => {
    setCommentsLoadingState(prev => new Map(prev).set(postId, true));
    try {
      const response = await apiClient.get(`/posts/${postId}/comments`);
      setPostComments(prev => new Map(prev).set(postId, response.data.comments || []));
    } catch { // ✅ Đã sửa: Xóa (error)
      toast({
        title: "Error",
        description: `Failed to fetch comments for post ${postId}.`,
        variant: "destructive",
      });
      setPostComments(prev => new Map(prev).set(postId, []));
    } finally {
      setCommentsLoadingState(prev => new Map(prev).set(postId, false));
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      setUserPosts([]);
      setPostsPage(1);
      setPostsHasMore(true);
      setPostComments(new Map());
      setCommentsLoadingState(new Map());
      setCommentsVisibleState(new Map());
      fetchUserPostsInCommunity(1);
    }
  }, [isOpen, fetchUserPostsInCommunity]);

  const handleLoadMorePosts = () => {
    setPostsPage(prev => prev + 1);
    fetchUserPostsInCommunity(postsPage + 1);
  };

  const handleEditPost = (postId: string) => {
    toast({ title: "Info", description: `Edit post ${postId}` });
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.delete(`/posts/${postId}`);
      toast({ title: "Success", description: "Post deleted." });
      setUserPosts(prev => prev.filter(post => post.id !== postId));
      setPostComments(prev => { const newMap = new Map(prev); newMap.delete(postId); return newMap; });
    } catch { // ✅ Đã sửa: Xóa (error)
      toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" });
    }
  };

  const handleApprovePost = async (postId: string) => {
    try {
      await apiClient.post(`/posts/${postId}/approve`);
      toast({ title: "Success", description: "Post approved." });
      setUserPosts(prev => prev.map(post => post.id === postId ? { ...post, status: 'approved' } : post));
    } catch { // ✅ Đã sửa: Xóa (error)
      toast({ title: "Error", description: "Failed to approve post.", variant: "destructive" });
    }
  };

  const handleRejectPost = async (postId: string) => {
    try {
      await apiClient.post(`/posts/${postId}/reject`);
      toast({ title: "Success", description: "Post rejected." });
      setUserPosts(prev => prev.map(post => post.id === postId ? { ...post, status: 'rejected' } : post));
    } catch { // ✅ Đã sửa: Xóa (error)
      toast({ title: "Error", description: "Failed to reject post.", variant: "destructive" });
    }
  };

  const toggleCommentsVisibility = (postId: string) => {
    setCommentsVisibleState(prev => {
      const newMap = new Map(prev);
      const isVisible = !newMap.get(postId);
      newMap.set(postId, isVisible);
      if (isVisible && !postComments.has(postId)) {
        fetchCommentsForPost(postId);
      }
      return newMap;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dialog-glass sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Posts by {member.name}</DialogTitle>
          <DialogDescription>
            Viewing posts made by {member.name} in the selected community.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {postsLoading && userPosts.length === 0 ? (
            <p className="text-center text-muted-foreground">
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin inline-block" /> Loading posts...
            </p>
          ) : userPosts.length === 0 ? (
            <p className="text-muted-foreground">No posts found for {member.name} in this community.</p>
          ) : (
            <div className="space-y-4">
              {userPosts.map(post => {
                const canManage = canManagePost(post);
                const canApproveReject = canApproveRejectPost();
                
                return (
                  <GlassCard key={post.id} className="p-4 liquid-glass-card">
                    <Link href={`/post/${post.id}`} className="block">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-foreground">{post.content.substring(0, 150)}{post.content.length > 150 ? '...' : ''}</p>
                        <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <span className="capitalize">Status: {post.status}</span>
                      {canApproveReject && post.status === 'pending' && (
                        <>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleApprovePost(post.id); }} disabled={postsLoading} className="liquid-glass-button">
                            Approve
                          </Button>
                          <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleRejectPost(post.id); }} disabled={postsLoading} className="liquid-glass-button">
                            Reject
                          </Button>
                        </>
                      )}
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditPost(post.id); }} disabled={postsLoading} className="liquid-glass-button">
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={postsLoading} className="liquid-glass-button">
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="dialog-glass">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this post.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="liquid-glass-button">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePost(post.id)}
                                  className="liquid-glass-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirm Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => toggleCommentsVisibility(post.id)} disabled={commentsLoadingState.get(post.id)} className="liquid-glass-button">
                        {commentsVisibleState.get(post.id) ? 'Hide Comments' : 'View Comments'}
                        {commentsLoadingState.get(post.id) && <Icons.spinner className="ml-2 h-3 w-3 animate-spin" />}
                      </Button>
                    </div>

                    {commentsVisibleState.get(post.id) && (
                      <div className="mt-4 pl-4 border-l border-border space-y-2">
                        <h5 className="font-semibold text-sm">Comments:</h5>
                        {commentsLoadingState.get(post.id) ? (
                          <p className="text-muted-foreground text-xs">
                            <Icons.spinner className="mr-1 h-3 w-3 animate-spin inline-block" /> Loading comments...
                          </p>
                        ) : postComments.get(post.id)?.length === 0 ? (
                          <p className="text-muted-foreground text-xs">No comments yet.</p>
                        ) : (
                          postComments.get(post.id)?.map(comment => (
                            <div key={comment.id} className="text-xs">
                              <p><strong>{comment.author.name}:</strong> {comment.content}</p>
                              <p className="text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
              {postsHasMore && (
                <Button
                  onClick={handleLoadMorePosts}
                  disabled={postsLoading}
                  className="liquid-glass-button w-full mt-4"
                >
                  {postsLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Load More
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose} className="liquid-glass-button">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}