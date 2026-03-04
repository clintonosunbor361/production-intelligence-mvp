import { hasPermission } from '@/lib/auth/permissions';
import ProductionClient from './ProductionClient';

export default async function ProductionPage() {
    const canManageProduction = await hasPermission('manage_production');
    return <ProductionClient canManageProduction={canManageProduction} />;
}
