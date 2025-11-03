'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import DashboardHeader from '@/components/layout/dashboard-header';
import SidebarNav from '@/components/layout/sidebar-nav';
import { Sidebar, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ParticleBackground } from '@/components/layout/ParticleBackgroundClient';
import { RightRail } from '@/components/layout/right-rail';
import { cn } from '@/lib/utils';
import { FloatingMessenger } from '@/components/messaging/floating-messenger';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import { useTranslation } from '@/hooks/use-translation';
import {
  Flame,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

import Link from 'next/link';

function SidebarLoadingSkeleton() {
  return (
    <div className="w-12 p-2 space-y-2 rounded-xl border border-white/10 bg-background/60 backdrop-blur">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-8 w-8 animate-pulse rounded-lg bg-muted/40"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

function HeaderLoadingSkeleton() {
  return (
    <div className="flex h-16 items-center gap-4 border-b border-white/10 bg-background/75 px-6 backdrop-blur">
      <div className="h-9 w-44 animate-pulse rounded-lg bg-primary/10" />
      <div className="ml-auto flex gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted/40" />
        <div
          className="h-10 w-10 animate-pulse rounded-full bg-muted/40"
          style={{ animationDelay: '120ms' }}
        />
      </div>
    </div>
  );
}

function FeedToolbar() {
  const { t } = useTranslation('common');
  const pathname = usePathname(); // Lấy đường dẫn URL hiện tại, ví dụ: "/events"

  // Bước 3: Xác định tab active dựa trên URL thay vì state
  // Điều này giúp UI luôn đồng bộ với trang người dùng đang xem.
  const activeTab = pathname.startsWith('/events') ? 'events'
                  : pathname.startsWith('/communities') ? 'communities'
                  : 'posts';

  // State cho các nút sắp xếp vẫn được giữ lại vì chúng là bộ lọc trên cùng một trang
  const [activeSort, setActiveSort] = useState('best');

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-card border rounded-lg shadow-sm">
      
      {/* Nhóm 1: Lọc theo loại nội dung (giờ đã là các link điều hướng) */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-md">
        
        {/* Bước 4: Sử dụng pattern <Button asChild> lồng <Link> */}
        <Button asChild variant={activeTab === 'posts' ? 'secondary' : 'ghost'} size="sm" className="text-xs sm:text-sm">
          {/* Giả sử trang chủ là trang bài viết */}
          <Link href="/">{t('feed.posts')}</Link>
        </Button>

        <Button asChild variant={activeTab === 'communities' ? 'secondary' : 'ghost'} size="sm" className="text-xs sm:text-sm">
          <Link href="/dashboard/communities">{t('feed.communities')}</Link>
        </Button>

        <Button asChild variant={activeTab === 'events' ? 'secondary' : 'ghost'} size="sm" className="text-xs sm:text-sm">
          <Link href="/dashboard/events">{t('feed.events')}</Link>
        </Button>

      </div>

      {/* Nhóm 2: Sắp xếp (Không thay đổi vì đây là các bộ lọc) */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeSort === 'best' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSort('best')}
          className="text-xs sm:text-sm"
        >
          <Flame className="mr-2 h-4 w-4" /> {t('feed.best')}
        </Button>
        <Button
          variant={activeSort === 'new' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveSort('new')}
          className="text-xs sm:text-sm"
        >
          <Clock className="mr-2 h-4 w-4" /> {t('feed.new')}
        </Button>
        <Button
          variant={activeSort === 'top' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveSort('top')}
          className="text-xs sm:text-sm"
        >
          <ArrowUpRight className="mr-2 h-4 w-4" /> {t('feed.top')}
        </Button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [isLoaded] = useState(true);
  const [scrollY] = useState(0);
  const mainRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const isFeedPage = pathname === '/dashboard';
  const { setOpen, state, isMobile, isPinned } = useSidebar();
  const hoverOpenRef = useRef(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsClient(true), 0);
  }, []);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const scrollToContent = () => {
      const scrollAnchors = mainEl.querySelectorAll('[data-scroll-anchor]');
      const lastAnchor = scrollAnchors.length > 0 ? scrollAnchors[scrollAnchors.length - 1] : null;
      
      if (lastAnchor) {
        lastAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const contentStart = isFeedPage ? 120 : 80;
        mainEl.scrollTo({ top: contentStart, behavior: 'smooth' });
      }
    };

    const timeoutId = setTimeout(scrollToContent, 150);
    return () => clearTimeout(timeoutId);
  }, [pathname, isFeedPage]);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const scrollAnchors = mainEl.querySelectorAll('[data-scroll-anchor]');
    const lastAnchor = scrollAnchors.length > 0 ? scrollAnchors[scrollAnchors.length - 1] : null;
    
    if (lastAnchor) {
      setTimeout(() => {
        lastAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname]);

  const handleSidebarEnter = () => {
    if (isMobile || isPinned) return;
    if (state === 'collapsed') {
      hoverOpenRef.current = true;
      setOpen(true);
    }
  };

  const handleSidebarLeave = () => {
    if (isMobile || isPinned) return;
    if (hoverOpenRef.current) {
      setOpen(false);
      hoverOpenRef.current = false;
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      <ParticleBackground />
      <FloatingMessenger />

      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur">
        <Suspense fallback={<HeaderLoadingSkeleton />}>
          <DashboardHeader scrollY={scrollY} />
        </Suspense>
      </header>

      <div className="relative flex flex-1 w-full overflow-x-hidden">
        {isClient && (
          <div
            className="z-40 hidden md:flex flex-shrink-0 relative"
            onMouseEnter={handleSidebarEnter}
            onMouseLeave={handleSidebarLeave}
          >
            <Sidebar
              collapsible="icon"
              className={cn(
                'hidden md:flex md:flex-col border-r border-border/60 bg-background/70 backdrop-blur transition-all duration-300 pt-16',
                isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
              )}
            >
              <Suspense fallback={<SidebarLoadingSkeleton />}>
                <SidebarNav />
              </Suspense>
            </Sidebar>
          </div>
        )}
        
        <SidebarInset className="flex flex-1 bg-background/40 min-w-0 w-full">
          <main
            ref={!isFeedPage ? mainRef : undefined}
            className={cn(
              'flex flex-1 w-full overflow-x-hidden',
              !isFeedPage && 'overflow-y-auto'
            )}
          >
            {isFeedPage ? (
              <div className="w-full px-4 py-6 lg:px-8 xl:px-12 2xl:px-16">
                <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
                  <section
                    ref={isFeedPage ? mainRef : undefined}
                    className="min-w-0 w-full space-y-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-6 lg:pb-10 custom-scrollbar lg:justify-self-center"
                  >
                    <div className="hidden md:block">
                      <Breadcrumbs />
                    </div>
                    <FeedToolbar />
                    <div className="space-y-4">{children}</div>
                  </section>
                  <RightRail className="lg:justify-self-start" />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-full px-4 py-6 lg:px-12">
                <div className="hidden md:block pb-4">
                  <Breadcrumbs />
                </div>
                <div className="w-full">{children}</div>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout>
      {children}
    </Layout>
  );
}
