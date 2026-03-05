import { getUserPermissions } from '@/lib/auth/permissions';
import QCQueue from './QcClient';

export default async function QCQueuePage() {
    const { permissions } = await getUserPermissions();
    return <QCQueue permissions={permissions} />;
}
