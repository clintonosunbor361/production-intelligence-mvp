import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function ItemList() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        const data = await db.getItems();
        setItems(data);
        setLoading(false);
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'New': return 'brand';
            case 'Received': return 'success';
            case 'Cancelled': return 'danger';
            case 'Hold': return 'warning';
            default: return 'neutral';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Production Items</h1>
                    <p className="text-sm text-maison-secondary">Track all physical items in the pipeline</p>
                </div>
                <Button onClick={() => navigate('/production/create')}>
                    <Plus size={16} className="mr-2" />
                    Create Item
                </Button>
            </div>

            <Card padding="p-0">
                <Table headers={['Item Key', 'Ticket', 'Customer', 'Product', 'Status', 'Date']}>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium font-mono text-xs">{item.item_key}</TableCell>
                            <TableCell>{item.ticket_id}</TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell>{item.product_type_name}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(item.status)}>
                                    {item.status}
                                </Badge>
                                {item.needs_qc_attention && (
                                    <Badge variant="warning" className="ml-2">Needs QC</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-gray-500">
                                {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length === 0 && !loading && (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No items found. Create one to get started.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    );
}
