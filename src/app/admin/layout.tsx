import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { getJoinField } from '@/lib/utils/supabase-join';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Get facilitator info
  const { data: facilitator } = await supabase
    .from('facilitator_users')
    .select(`
      id,
      display_name,
      role,
      organization:organizations(id, name)
    `)
    .eq('user_id', user.id)
    .single();

  if (!facilitator) {
    // User is authenticated but not a facilitator
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-white/80 mb-6">
            Your account is not associated with any organization. Please contact an administrator.
          </p>
          <Link
            href="/"
            className="text-white hover:underline"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <AdminNav 
        user={{
          email: user.email || '',
          displayName: facilitator.display_name,
          role: facilitator.role,
          organizationName: getJoinField(facilitator.organization, 'name') || '',
        }}
      />
      <main className="flex-1 overflow-auto">
        <Breadcrumbs />
        {children}
      </main>
    </div>
  );
}
