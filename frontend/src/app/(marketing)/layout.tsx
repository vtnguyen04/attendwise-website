import MarketingFooter from "@/components/marketing/marketing-footer";
import MarketingHeader from "@/components/marketing/marketing-header";
import { UserProvider } from '@/context/user-provider';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <UserProvider>
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </UserProvider>
    </div>
  );
}
