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
    const [filter, setFilter] = useState('available'); // 'all', 'received', 'available'

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        const data = await db.getItems();
        setItems(data.filter(i => i.status !== 'Cancelled'));
        setLoading(false);
    };

    const filteredItems = items.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'received') return item.status === 'Received';
        if (filter === 'available') return item.status !== 'Received';
        return true;
    });

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

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Items
                    </button>
                    <button
                        onClick={() => setFilter('available')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'available' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Available
                    </button>
                    <button
                        onClick={() => setFilter('received')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'received' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Received
                    </button>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Item Key', 'Product', 'Customer', 'Current Status', 'Action']}>
                    {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium font-mono text-xs">{item.item_key}</TableCell>
                            <TableCell>{item.product_type_name}</TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell>
                                <Badge variant={item.status === 'Received' ? 'success' : 'brand'}>{item.status}</Badge>
                            </TableCell>
                            <TableCell>
                                {item.status !== 'Received' ? (
                                    <Button
                                        size="sm"
                                        className="bg-maison-primary"
                                        onClick={() => handleReceive(item.id)}
                                    >
                                        <PackageCheck size={16} className="mr-2" />
                                        Receive Item
                                    </Button>
                                ) : (
                                    <span className="text-sm text-gray-500 italic">Received</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredItems.length === 0 && !loading && (
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
