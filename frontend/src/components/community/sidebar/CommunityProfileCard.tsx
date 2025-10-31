'use client';

import { Community } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Users from 'lucide-react/icons/users';
import BookOpen from 'lucide-react/icons/book-open';
import Share2 from 'lucide-react/icons/share-2';
import ArrowRight from 'lucide-react/icons/arrow-right';
import X from 'lucide-react/icons/x';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { getNullableStringValue } from '@/lib/utils';

interface CommunityProfileCardProps {
  community: Community;
}

export function CommunityProfileCard({ community }: CommunityProfileCardProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const fullDescription = getNullableStringValue(community.description, 'No description available.');
  const isLongDescription = fullDescription.length > 150;
  const displayedDescription = isLongDescription 
    ? fullDescription.substring(0, 150) + '...' 
    : fullDescription;

  return (
    <>
      <div className="relative bg-glass-interactive rounded-2xl border-2 border-white/20 light:border-gray-300 p-4 space-y-4 group">
        {/* Overlay for hover effect */}
        <div className="absolute inset-0 rounded-2xl bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
        
        {/* Header */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold dark:text-white light:text-gray-900 line-clamp-2">
            {community.name}
          </h2>
          <div className="space-y-2">
            <p className="text-sm dark:text-gray-400 light:text-gray-600 line-clamp-3 leading-relaxed">
              {displayedDescription}
            </p>
            {isLongDescription && (
              <button
                onClick={() => setIsDescriptionOpen(true)}
                className="text-xs font-semibold dark:text-purple-400 light:text-purple-600 hover:dark:text-purple-300 hover:light:text-purple-700 transition-colors"
              >
                Read More
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 py-3 px-3 dark:bg-white/5 light:bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="p-2 dark:bg-purple-500/20 light:bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 dark:text-purple-400 light:text-purple-600" />
            </div>
            <div>
              <p className="text-xs dark:text-gray-400 light:text-gray-500 font-medium">Members</p>
              <p className="text-lg font-bold dark:text-white light:text-gray-900">
                {community.member_count || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <Button 
          className="w-full liquid-glass-button text-white font-semibold h-11"
        >
          <Users className="h-4 w-4 mr-2" />
          Invite People
        </Button>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/5 dark:via-gray-700 light:via-gray-200 to-transparent"></div>

        {/* Quick Links */}
        <div className="space-y-3">
          <p className="text-xs font-bold dark:text-gray-400 light:text-gray-500 uppercase tracking-wider">
            Explore
          </p>
          <nav className="space-y-2">
            <a 
              href="#start-here" 
              className="flex items-center justify-between px-4 py-3 liquid-glass-button text-sm font-semibold dark:text-purple-400 light:text-purple-600 group"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 dark:text-purple-400 light:text-purple-600" />
                Start Here
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-200" />
            </a>
            
            <a 
              href="#resources" 
              className="flex items-center justify-between px-4 py-3 liquid-glass-button text-sm font-semibold dark:text-purple-400 light:text-purple-600 group"
            >
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 dark:text-purple-400 light:text-purple-600" />
                Resources
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-200" />
            </a>
          </nav>
        </div>
      </div>

      {/* Description Modal */}
      <Dialog open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border dark:border-white/5 light:border-gray-200 dark:bg-slate-900/50 light:bg-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl dark:text-white light:text-gray-900">
              {community.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Community description
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="dark:text-gray-300 light:text-gray-700 leading-relaxed whitespace-pre-wrap">
              {fullDescription}
            </p>
            
            <div className="flex items-center gap-4 p-4 dark:bg-white/5 light:bg-gray-50 rounded-xl">
              <div className="p-3 dark:bg-purple-500/20 light:bg-purple-100 rounded-lg flex-shrink-0">
                <Users className="h-6 w-6 dark:text-purple-400 light:text-purple-600" />
              </div>
              <div>
                <p className="text-sm dark:text-gray-400 light:text-gray-500">Members</p>
                <p className="text-2xl font-bold dark:text-white light:text-gray-900">
                  {community.member_count || 0}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}