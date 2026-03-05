import { getUserPermissions } from '@/lib/auth/permissions';
import ManageCategories from './CategoriesClient';

export default async function ManageCategoriesPage() {
    const { permissions } = await getUserPermissions();
    return <ManageCategories permissions={permissions} />;
}
