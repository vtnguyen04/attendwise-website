'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import SidebarNav from '@/components/layout/sidebar-nav';
import { Sidebar, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { ParticleBackground } from '@/components/layout/ParticleBackgroundClient';
// import { FloatingOrb } from '@/components/layout/FloatingOrbClient';
import { cn } from '@/lib/utils';



function SidebarLoadingSkeleton() {

  return (

    <div className="w-12 p-2 space-y-2 glass-container">

      {[...Array(8)].map((_, i) => (

        <div 

          key={i} 

          className="h-8 w-8 bg-muted/50 rounded-lg animate-pulse"

          style={{ animationDelay: `${i * 100}ms` }}

        />

      ))}

    </div>

  );

}



function HeaderLoadingSkeleton() {

  return (

    <div className="h-16 px-6 flex items-center gap-4 glass-container border-b border-transparent">

      <div className="h-10 w-48 bg-primary/10 rounded-lg animate-pulse" />

      <div className="ml-auto flex gap-3">

        <div className="h-10 w-10 bg-muted/50 rounded-full animate-pulse" />

        <div className="h-10 w-10 bg-muted/50 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />

      </div>

    </div>

  );

}



const purpleOrbPosition = { top: '20%', left: '20%' };

const blueOrbPosition = { top: 'auto', bottom: '20%', right: '20%' };

const pinkOrbPosition = { top: '60%', right: '40%' };



function Layout({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(true);

    const mainEl = mainRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      setScrollY(mainEl.scrollTop);
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      <ParticleBackground />

      <div className="z-50">
        <Sidebar
          collapsible="icon"
          className={cn(
            `hidden md:flex md:flex-col transition-all duration-300 transform-gpu glass-container`,
            isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          )}
        >
          <Suspense fallback={<SidebarLoadingSkeleton />}>
            <SidebarNav />
          </Suspense>
        </Sidebar>
      </div>

      <SidebarInset className="flex-1 flex flex-col bg-transparent">
        <header
          className={cn(
            `sticky top-0 z-40 transition-all duration-500 transform-gpu glass-container border-b`,
            isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          )}
        >
          <Suspense fallback={<HeaderLoadingSkeleton />}>
            <DashboardHeader scrollY={scrollY} />
          </Suspense>
        </header>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent p-4 sm:p-6 lg:p-8"
        >
          <div className="bg-glass h-full w-full rounded-lg p-4 sm:p-6 lg:p-8">
            <div className="animate-fade-in-up duration-700">{children}</div>
          </div>
        </main>
      </SidebarInset>
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


