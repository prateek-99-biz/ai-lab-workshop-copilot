'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui';

interface WaitingForSessionProps {
  sessionId: string;
}

export function WaitingForSession({ sessionId }: WaitingForSessionProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>('waiting');

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to realtime session status changes
    const channel = supabase
      .channel(`session-status:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'live') {
            // Session is now live - reload to get the full workshop
            router.refresh();
          } else if (newStatus === 'ended') {
            setStatus('ended');
          }
        }
      )
      .subscribe();

    // Poll every 30 seconds as a fallback (realtime handles the fast path)
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (data?.status === 'live') {
        router.refresh();
      } else if (data?.status === 'ended') {
        setStatus('ended');
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [sessionId, router]);

  if (status === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Session Ended</h1>
          <p className="text-white/80">This workshop session has ended.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Session Not Started</h1>
        <p className="text-white/80">Please wait for the facilitator to start the session.</p>
        <p className="text-white/50 text-sm mt-4">You&apos;ll be taken in automatically when it begins.</p>
      </div>
    </div>
  );
}
