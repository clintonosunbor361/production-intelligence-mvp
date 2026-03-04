import { hasPermission } from '@/lib/auth/permissions';
import TailorsClient from './TailorsClient';

export default async function ManageTailorsPage() {
    const canManageTailors = await hasPermission('manage_tailors');
    return <TailorsClient canManageTailors={canManageTailors} />;
}
