import {
  Archive,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Play,
  XCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { AnyEventStatus } from '@/lib/types'; // SỬA: Dùng kiểu AnyEventStatus

type StatusInfo = {
  icon: ComponentType<{ className?: string }>;
  text: string;
  className: string;
};

export function getEventStatusInfo(status: AnyEventStatus): StatusInfo { // SỬA: Dùng kiểu AnyEventStatus
  switch (status) {
    case 'published':
      return {
        icon: CalendarCheck,
        text: 'Published',
        className: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
      };
    case 'ongoing':
      return {
        icon: Play,
        text: 'Ongoing',
        className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      };
    case 'past': // 'completed' không có trong type, tôi đã bỏ đi để khớp 100%
      return {
        icon: CheckCircle,
        text: 'Completed',
        className: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
      };
    case 'cancelled':
      return {
        icon: XCircle,
        text: 'Cancelled',
        className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
      };
    case 'upcoming':
      return {
        icon: Calendar,
        text: 'Upcoming',
        className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
      };
    case 'draft':
    default:
      return {
        icon: Archive,
        text: 'Draft',
        className: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
      };
  }
}