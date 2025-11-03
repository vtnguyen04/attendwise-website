import MarketingFooter from "@/components/marketing/marketing-footer";
import MarketingHeader from "@/components/marketing/marketing-header";
import { UserProvider } from '@/context/user-provider';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground">
      <UserProvider>
        <MarketingHeader />
        <main className="flex-1 w-full overflow-x-hidden">
          <div className="flex w-full flex-col items-stretch">{children}</div>
        </main>
        <MarketingFooter />
      </UserProvider>
    </div>
  );
}
