import { ParticleBackground } from '@/components/ParticleBackgroundClient';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-center w-full min-h-screen bg-background">
      <ParticleBackground />
      <div className="z-10 w-full max-w-md p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}