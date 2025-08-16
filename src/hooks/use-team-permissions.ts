import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface TeamPermission {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
  canManageBilling: boolean;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
}

export function useTeamPermissions(teamId?: string) {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<TeamPermission>({
    canRead: false,
    canWrite: false,
    canDelete: false,
    canManage: false,
    canManageBilling: false,
    role: null,
  });
  const [loading, setLoading] = useState(true);

  const checkPermissions = async () => {
    if (!session?.user?.email || !teamId) {
      setPermissions({
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
        canManageBilling: false,
        role: null,
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      if (response.ok) {
        const members = await response.json();
        const currentUserMember = members.find((m: any) => m.user.email === session.user?.email);
        
        if (currentUserMember) {
          const role = currentUserMember.role;
          setPermissions({
            canRead: true, // All team members can read
            canWrite: role !== 'MEMBER', // Owners and admins can write
            canDelete: role === 'OWNER' || role === 'ADMIN', // Owners and admins can delete
            canManage: role === 'OWNER' || role === 'ADMIN', // Owners and admins can manage
            canManageBilling: role === 'OWNER', // Only owners can manage billing
            role,
          });
        }
      }
    } catch (error) {
      console.error('Error checking team permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, [session, teamId]);

  return { permissions, loading, refetch: checkPermissions };
}