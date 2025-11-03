import { ParticleBackground } from '@/components/layout/ParticleBackgroundClient';
import { UserProvider } from '@/context/user-provider';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background text-foreground">
      <ParticleBackground />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,0.12),transparent_55%),radial-gradient(circle_at_80%_85%,rgba(14,116,144,0.12),transparent_55%)]" />
      <div className="relative z-10 w-full max-w-md px-6 py-10 sm:px-8">
        <UserProvider>{children}</UserProvider>
      </div>
    </div>
  );
}
