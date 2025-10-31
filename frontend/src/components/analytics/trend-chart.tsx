'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const TrendChartContent = dynamic(() => import('./TrendChartContent'), {
  ssr: false,
  loading: () => <div style={{ height: '300px' }} className="flex items-center justify-center">Loading chart...</div>
});

export function TrendChart() {
  return (
    <Card className="h-full backdrop-blur-sm bg-white/30 dark:bg-gray-900/30 border border-white/20 dark:border-gray-800/50 shadow-lg">
      <CardHeader>
        <CardTitle>Platform Growth</CardTitle>
        <CardDescription>New users and events over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent className="pl-0">
        <Suspense fallback={<div style={{ height: '300px' }} className="flex items-center justify-center">Loading chart...</div>}>
          <TrendChartContent />
        </Suspense>
      </CardContent>
    </Card>
  );
}