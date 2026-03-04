import { hasPermission } from '@/lib/auth/permissions';
import CompletionClient from './CompletionClient';

export default async function CompletionPage() {
    const canManageCompletion = await hasPermission('manage_completion');
    return <CompletionClient canManageCompletion={canManageCompletion} />;
}
