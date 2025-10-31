import { AdminNavClient } from '@/components/community/layout/AdminNavClient';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function CommunityAdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Manage your community settings and members.</p>
      </div>

      {/* Horizontal Navigation - Top */}
      <AdminNavClient />

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-lg">
        {children}
      </div>
    </div>
  );
}