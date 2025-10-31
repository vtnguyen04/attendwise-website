'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import CheckCircle from 'lucide-react/icons/check-circle';
import XCircle from 'lucide-react/icons/x-circle';
import Loader2 from 'lucide-react/icons/loader-2';
import Link from 'next/link';

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = params;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState('');
  const [communityId, setCommunityId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link: Token missing.');
      return;
    }

    const acceptInvite = async () => {
      setStatus('loading');
      try {
        const response = await apiClient.get(`/api/v1/communities/invites/${token}/accept`);
        setStatus('success');
        setMessage(response.data.message || 'Invitation accepted successfully!');
        setCommunityId(response.data.community_id);
        toast({ title: 'Success', description: response.data.message || 'You have joined the community!' });
        // Optionally redirect after a short delay
        // setTimeout(() => {
        //   router.push(response.data.community_id ? `/dashboard/communities/${response.data.community_id}` : '/dashboard/communities');
        // }, 3000);
      } catch (error: any) {
        setStatus('error');
        const errorMessage = error.response?.data?.error || 'Failed to accept invitation.';
        setMessage(errorMessage);
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      }
    };

    acceptInvite();
  }, [token, toast]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-xl font-semibold">Accepting Invitation...</p>
            <p className="text-gray-500">Please wait while we process your request.</p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-xl font-semibold">Success!</p>
            <p className="text-gray-500">{message}</p>
            {communityId && (
              <Link href={`/dashboard/communities/${communityId}`}>
                <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Go to Community
                </button>
              </Link>
            )}
            {!communityId && (
              <Link href="/dashboard/communities">
                <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Go to Communities Dashboard
                </button>
              </Link>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="text-xl font-semibold">Error!</p>
            <p className="text-gray-500">{message}</p>
            <Link href="/dashboard/communities">
              <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Browse Communities
              </button>
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        {renderContent()}
      </div>
    </div>
  );
}
