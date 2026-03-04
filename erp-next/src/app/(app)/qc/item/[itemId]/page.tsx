import { hasPermission } from '@/lib/auth/permissions';
import QcItemClient from './QcItemClient';

export default async function ManageItemTasksPage({ params }: { params: { itemId: string } }) {
    const canManageQc = await hasPermission('manage_qc');
    return <QcItemClient canManageQc={canManageQc} itemId={params.itemId} />;
}
