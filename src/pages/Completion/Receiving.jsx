import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { PackageCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function Receiving() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        const data = await db.getItems();
        // Show only items that are NOT Received (Processing)
        setItems(data.filter(i => i.status !== 'Received' && i.status !== 'Cancelled'));
        setLoading(false);
    };

    const handleReceive = async (itemId) => {
        if (!window.confirm("Mark item as Physically Received?")) return;
        await db.updateItemStatus(itemId, 'Received');
        loadItems();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Completion & Receiving</h1>
                    <p className="text-sm text-maison-secondary">Mark items as finished and received into stock</p>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Item Key', 'Product', 'Customer', 'Current Status', 'Action']}>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium font-mono text-xs">{item.item_key}</TableCell>
                            <TableCell>{item.product_type_name}</TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell>
                                <Badge variant="brand">{item.status}</Badge>
                            </TableCell>
                            <TableCell>
                                <Button
                                    size="sm"
                                    className="bg-maison-primary"
                                    onClick={() => handleReceive(item.id)}
                                >
                                    <PackageCheck size={16} className="mr-2" />
                                    Receive Item
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length === 0 && !loading && (
                        <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No items pending receipt.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    );
}
