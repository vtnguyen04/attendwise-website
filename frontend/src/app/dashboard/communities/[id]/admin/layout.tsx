import AdminLayoutClient from './AdminLayoutClient';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function CommunityAdminLayout({ children }: AdminLayoutProps) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}