// components/events/actions/capacity-indicator.tsx
'use client';

interface CapacityIndicatorProps {
  current: number;
  max: number;
}

export function CapacityIndicator({ current, max }: CapacityIndicatorProps) {
  const percentage = max > 0 ? (current / max) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-muted-foreground">Capacity</span>
        <span className="font-bold">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {current} / {max} attendees
      </p>
    </div>
  );
}