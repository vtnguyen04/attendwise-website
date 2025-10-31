export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient opacity-60 blur-3xl" />
      <main className="space-y-10">{children}</main>
    </div>
  );
}
