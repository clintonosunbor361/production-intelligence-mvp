import { getUserPermissions } from '@/lib/auth/permissions';
import ManageProductTypes from './ProductsClient';

export default async function ManageProductTypesPage() {
    const { permissions } = await getUserPermissions();
    return <ManageProductTypes permissions={permissions} />;
}
