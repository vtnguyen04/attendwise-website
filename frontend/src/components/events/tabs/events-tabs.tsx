'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EventsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function EventsTabs({ activeTab, onTabChange }: EventsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <div className="dashboard-toolbar max-w-2xl mx-auto">
        <TabsList className="w-full grid grid-cols-4 gap-2 bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="upcoming"
            className="toolbar-pill"
            data-active={activeTab === 'upcoming'}
          >
            Upcoming
          </TabsTrigger>
          <TabsTrigger 
            value="ongoing"
            className="toolbar-pill"
            data-active={activeTab === 'ongoing'}
          >
            Ongoing
          </TabsTrigger>
          <TabsTrigger 
            value="attending"
            className="toolbar-pill"
            data-active={activeTab === 'attending'}
          >
            Attending
          </TabsTrigger>
          <TabsTrigger 
            value="past"
            className="toolbar-pill"
            data-active={activeTab === 'past'}
          >
            Past
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}