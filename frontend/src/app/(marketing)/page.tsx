// src/app/(marketing)/page.tsx (ĐÃ TỐI ƯU)

// Loại bỏ 'use client', useEffect, useState

import { FeaturedCommunitiesSection } from '@/components/marketing/featured-communities-section';
import { HeroSection } from '@/components/marketing/hero-section';
import { getPublicCommunities } from '@/lib/services/public.service';


// Biến component thành một async function
export default async function RootPage() {
  // Fetch dữ liệu trực tiếp trên server
  await getPublicCommunities(3);

  return (
    <div className="flex w-full flex-col">
      <HeroSection />

      <FeaturedCommunitiesSection />
    </div>
  );
}