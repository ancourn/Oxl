'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTeamPermissions } from '@/hooks/use-team-permissions';

interface WithTeamProtectionProps {
  teamId?: string;
  requiredPermission?: 'read' | 'write' | 'delete' | 'manage' | 'manageBilling';
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function withTeamProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithTeamProtectionProps = {}
) {
  return function ProtectedComponent(props: P) {
    const { data: session } = useSession();
    const router = useRouter();
    const { permissions, loading } = useTeamPermissions(options.teamId);
    
    const {
      requiredPermission = 'read',
      redirectTo = '/teams',
      fallback = null,
    } = options;

    useEffect(() => {
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      if (!loading) {
        let hasPermission = false;
        
        switch (requiredPermission) {
          case 'read':
            hasPermission = permissions.canRead;
            break;
          case 'write':
            hasPermission = permissions.canWrite;
            break;
          case 'delete':
            hasPermission = permissions.canDelete;
            break;
          case 'manage':
            hasPermission = permissions.canManage;
            break;
          case 'manageBilling':
            hasPermission = permissions.canManageBilling;
            break;
        }

        if (!hasPermission) {
          router.push(redirectTo);
        }
      }
    }, [session, loading, permissions, requiredPermission, redirectTo, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!session) {
      return null;
    }

    let hasPermission = false;
    switch (requiredPermission) {
      case 'read':
        hasPermission = permissions.canRead;
        break;
      case 'write':
        hasPermission = permissions.canWrite;
        break;
      case 'delete':
        hasPermission = permissions.canDelete;
        break;
      case 'manage':
        hasPermission = permissions.canManage;
        break;
      case 'manageBilling':
        hasPermission = permissions.canManageBilling;
        break;
    }

    if (!hasPermission) {
      return fallback || null;
    }

    return <WrappedComponent {...props} />;
  };
}