import CommunityForm from '@/components/community/shared/community-form';

export default function CreateCommunityPage() {
  return (
    <div className="relative mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-gradient bg-blob opacity-60 blur-3xl" />

      {/* Header Card */}
      <div className="glass-card p-6 shadow-glass-lg sm:p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-glow">Create a New Community</h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Build a space for people to connect and share. Fill out the details below to get started.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-card p-6 shadow-glass-lg sm:p-8">
        <CommunityForm mode="create" />
      </div>
    </div>
  );
}
