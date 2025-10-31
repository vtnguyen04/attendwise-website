import { getAdminCommunities } from '@/lib/services/community.server.service';
import EventForm from '@/components/events/event-form/event-form';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass-card';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default async function CreateEventPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const adminCommunities = await getAdminCommunities();

  return (
    <div className="space-y-6">
      <GlassCard>
        <CardHeader>
          <CardTitle className="text-4xl font-bold tracking-tight text-glow">Create a New Event</CardTitle>
          <CardDescription className="max-w-xl text-base text-muted-foreground">
            Set up a new event for your community. Provide the details to get started.
          </CardDescription>
        </CardHeader>
      </GlassCard>

      <GlassCard>
        <CardContent>
          <EventForm
            mode="create"
            communities={adminCommunities}
          />
        </CardContent>
      </GlassCard>
    </div>
  );
}