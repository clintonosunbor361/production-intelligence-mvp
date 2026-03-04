import { hasPermission } from '@/lib/auth/permissions';
import RatesClient from './RatesClient';

export default async function ManageTaskTypesPage() {
    const canManageRates = await hasPermission('manage_rates');
    return <RatesClient canManageRates={canManageRates} />;
}
