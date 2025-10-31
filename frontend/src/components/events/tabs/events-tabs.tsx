'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EventsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function EventsTabs({ activeTab, onTabChange }: EventsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 max-w-lg bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm hover:shadow-md transition-shadow duration-300">
        <TabsTrigger 
          value="upcoming"
          className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-all duration-200 py-2.5"
        >
          Upcoming
        </TabsTrigger>
        <TabsTrigger 
          value="ongoing"
          className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-all duration-200 py-2.5"
        >
          Ongoing
        </TabsTrigger>
        <TabsTrigger 
          value="attending"
          className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-all duration-200 py-2.5"
        >
          Attending
        </TabsTrigger>
        <TabsTrigger 
          value="past"
          className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-700 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-all duration-200 py-2.5"
        >
          Past
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}