
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Community } from '@/lib/types';
import Users2 from 'lucide-react/icons/users-2';
import TrendingUp from 'lucide-react/icons/trending-up';
import Sparkles from 'lucide-react/icons/sparkles';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Image from 'next/image';
import Link from 'next/link';

interface FeaturedCommunitiesSectionProps {
  communities: Community[];
}

export function FeaturedCommunitiesSection({ communities }: FeaturedCommunitiesSectionProps) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 py-16 sm:py-20 lg:py-32">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(139, 92, 246, 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="liquid-glass-badge mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Join the Community</span>
          </div>

          <h2 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white sm:text-5xl lg:text-6xl mb-4">
            Featured Communities
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Join vibrant communities that match your interests and connect with like-minded individuals
          </p>

          <Button
            asChild
            className="group liquid-glass-button"
          >
            <Link href="/communities" className="flex items-center gap-2">
              View All Communities
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {communities.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {communities.map((community, index) => (
              <div
                key={community.id}
                className="group animate-in fade-in slide-in-from-bottom-8 duration-1000"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glow Effect */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 group-hover:animate-pulse transition-all duration-500" />

                  <Card className="relative liquid-glass-card overflow-hidden group-hover:shadow-2xl group-hover:shadow-purple-500/20">
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                    <CardContent className="p-6 sm:p-8">
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        {/* Left Content */}
                        <div className="flex items-start gap-5 sm:items-center flex-1">
                          {/* Community Image with 3D Effect */}
                          <div className="relative flex-shrink-0 group/image">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl blur opacity-50 group-hover/image:opacity-100 transition-opacity duration-300" />
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-white/10 group-hover/image:border-purple-400/50 transition-all duration-300 transform group-hover/image:scale-110 group-hover/image:rotate-3">
                              <Image
                                src={community.cover_image_url.String || `https://source.unsplash.com/random/96x96?community&sig=${community.id}`}
                                alt={community.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>

                          {/* Community Info */}
                          <div className="min-w-0 flex-1 space-y-3">
                            <div>
                              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
                                {community.name}
                              </h3>
                              <p className="text-sm sm:text-base text-gray-400 line-clamp-2">
                                {community.description.String}
                              </p>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                                <Users2 className="w-4 h-4 text-purple-400" />
                                <span className="text-purple-300 font-semibold">
                                  {community.member_count.toLocaleString()}
                                </span>
                                <span className="text-gray-400">members</span>
                              </div>

                              {community.type && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      community.type === 'public'
                                        ? 'bg-green-400'
                                        : community.type === 'private'
                                        ? 'bg-yellow-400'
                                        : 'bg-red-400'
                                    } animate-pulse`}
                                  />
                                  <span className="text-blue-300 font-medium capitalize">
                                    {community.type}
                                  </span>
                                </div>
                              )}

                              {community.event_count > 0 && (
                                <div className="flex items-center gap-1 text-gray-400">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span className="text-xs">{community.event_count} events</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 sm:flex-col sm:w-auto w-full">
                          <Button
                            className="flex-1 sm:flex-none liquid-glass-button"
                            asChild
                          >
                            <Link href={`/communities/${community.id}`}>
                              View Details
                            </Link>
                          </Button>
                          <Button className="flex-1 sm:flex-none relative overflow-hidden group/btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300">
                            <span className="relative z-10 flex items-center gap-2">
                              Join Now
                              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 animate-in fade-in zoom-in duration-1000">
            <div className="inline-flex p-4 rounded-full bg-slate-800/50 backdrop-blur-md mb-4">
              <Users2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-lg">No featured communities available yet.</p>
            <p className="text-gray-500 text-sm mt-2">Check back soon for exciting communities to join!</p>
          </div>
        )}
      </div>
    </section>
  );
}