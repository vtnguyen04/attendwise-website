// app/components/community/layout/SidebarToggle.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme'; // 👈 Import hook theme

const SidebarContext = createContext<{ isOpen: boolean; toggleOpen: () => void } | undefined>(undefined);

export function useSidebarToggle() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarToggle must be used within SidebarToggleProvider');
  }
  return context;
}

export default function SidebarToggle({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const theme = useTheme(); // 👈 Lấy theme hiện tại

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <SidebarContext.Provider value={{ isOpen, toggleOpen }}>
      <div className="relative flex items-start gap-2">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleOpen}
          className={`flex-shrink-0 h-8 w-8 rounded-lg transition-all duration-300 transform-gpu ${
            theme === 'dark' 
              ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          } mt-1`}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {/* Sidebar Content - With fixed width when open, hidden when closed */}
        <div
          className={`transition-all duration-300 overflow-hidden transform-gpu ${
            isOpen 
              ? 'w-40 opacity-100 visible' 
              : 'w-0 opacity-0 invisible'
          }`}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}