import { getUserPermissions } from '@/lib/auth/permissions';
import RatesClient from './RatesClient';

export default async function ManageTaskTypesPage() {
    const { permissions } = await getUserPermissions();
    return <RatesClient permissions={permissions} />;
}

