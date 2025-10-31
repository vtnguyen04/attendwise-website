// 'use client';

// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { getPendingRegistrations, approveRegistration, denyRegistration } from '@/lib/services/event.service';
// import { EventAttendee } from '@/lib/types';
// import { Button } from '@/components/ui/button';
// import { useToast } from '@/hooks/use-toast';
// import { Loader2, Check, X } from 'lucide-react';
// import Image from 'next/image';

// interface PendingRegistrationsProps {
//   eventId: string;
// }

// export default function PendingRegistrations({ eventId }: PendingRegistrationsProps) {
//   const queryClient = useQueryClient();
//   const { toast } = useToast();

//   const { data: pending, isLoading, isError } = useQuery<EventAttendee[]>(
//     ['pending-registrations', eventId],
//     () => getPendingRegistrations(eventId),
//     {
//       enabled: !!eventId,
//     }
//   );

//   const approveMutation = useMutation(
//     approveRegistration,
//     {
//       onSuccess: () => {
//         toast({ title: 'Registration Approved' });
//         queryClient.invalidateQueries(['pending-registrations', eventId]);
//         queryClient.invalidateQueries(['event', eventId]); // To update attendee count
//       },
//       onError: (error: any) => {
//         toast({ title: 'Error', description: error.message, variant: 'destructive' });
//       },
//     }
//   );

//   const denyMutation = useMutation(
//     denyRegistration,
//     {
//       onSuccess: () => {
//         toast({ title: 'Registration Denied' });
//         queryClient.invalidateQueries(['pending-registrations', eventId]);
//       },
//       onError: (error: any) => {
//         toast({ title: 'Error', description: error.message, variant: 'destructive' });
//       },
//     }
//   );

//   if (isLoading) {
//     return <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin" /></div>;
//   }

//   if (isError) {
//     return <div className="text-red-500">Failed to load pending registrations.</div>;
//   }

//   if (!pending || pending.length === 0) {
//     return <p className="text-muted-foreground">There are no pending registration requests.</p>;
//   }

//   return (
//     <div className="space-y-4">
//         <h3 className="text-lg font-semibold">Pending Requests</h3>
//         <div className="rounded-md border">
//             <div className="divide-y divide-border">
//                 {pending.map((attendee) => (
//                     <div key={attendee.id} className="flex items-center justify-between p-4">
//                         <div className="flex items-center gap-4">
//                             <Image 
//                                 src={attendee.user_profile_picture_url?.String || '/images/default-avatar.png'}
//                                 alt={attendee.user_name}
//                                 width={40}
//                                 height={40}
//                                 className="rounded-full"
//                             />
//                             <div>
//                                 <p className="font-medium">{attendee.user_name}</p>
//                                 <p className="text-sm text-muted-foreground">{attendee.user_email}</p>
//                             </div>
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <Button 
//                                 size="icon"
//                                 variant="outline"
//                                 onClick={() => denyMutation.mutate({ eventId, registrationId: attendee.id })}
//                                 disabled={denyMutation.isLoading}
//                             >
//                                 <X className="h-4 w-4" />
//                             </Button>
//                             <Button 
//                                 size="icon"
//                                 onClick={() => approveMutation.mutate({ eventId, registrationId: attendee.id })}
//                                 disabled={approveMutation.isLoading}
//                             >
//                                 <Check className="h-4 w-4" />
//                             </Button>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     </div>
//   );
// }
