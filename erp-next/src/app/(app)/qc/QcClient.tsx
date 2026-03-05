// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/services/db';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table';
import { Modal } from '@/components/UI/Modal';
import { format } from 'date-fns';
import { Filter, ChevronRight } from 'lucide-react';
import ManageItemTasks from './item/[itemId]/QcItemClient';
import { hasPerm } from '@/lib/permissions';

export default function QCQueue({ permissions = [] }: { permissions?: string[] }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, new, received_attention

    const [rateCard, setRateCard] = useState([]);
    const [tailors, setTailors] = useState([]);

    const [selectedItemId, setSelectedItemId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        const [data, rc, t] = await Promise.all([
            db.getItems(),
            db.getRates(),
            db.getTailors()
        ]);
        // In a real app, we'd filter on DB side
        // For QC, we typically want to see Active items, not Cancelled
        setItems(data.filter(i => i.status !== 'Cancelled'));
        setRateCard(rc);
        setTailors(t);
        setLoading(false);
    };

    const filteredItems = items.filter(item => {
        if (filter === 'new') return item.status === 'New';
        if (filter === 'received_attention') return item.needs_qc_attention;
        return true;
    });

    const canManageQc = permissions.includes('manage_qc') || (permissions.length > 0 && hasPerm(permissions, 'manage_qc'));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Quality Control</h1>
                    <p className="text-sm text-maison-secondary">Assign tasks and verify quality</p>
                </div>

                {/* Simple Filter Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Items
                    </button>
                    <button
                        onClick={() => setFilter('new')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'new' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        New Items
                    </button>
                    <button
                        onClick={() => setFilter('received_attention')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'received_attention' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Needs Attention
                    </button>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Item Key', 'Customer Name', 'Product Type', 'Status', 'Assigned Date', 'Action']}>
                    {filteredItems.map((item) => (
                        <TableRow
                            key={item.id}
                            onClick={() => { setSelectedItemId(item.id); setIsModalOpen(true); }}
                            className="cursor-pointer"
                        >
                            <TableCell className="font-medium font-mono text-xs">{item.item_key}</TableCell>
                            <TableCell className="font-medium">{item.customer_name}</TableCell>
                            <TableCell>{item.product_type_name}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Badge variant={item.status === 'New' ? 'brand' : 'neutral'}>{item.status}</Badge>
                                    {item.needs_qc_attention && <Badge variant="warning">Check</Badge>}
                                </div>
                            </TableCell>
                            <TableCell className="text-gray-500">
                                {item.assigned_date ? format(new Date(item.assigned_date), 'MMM d') : '-'}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItemId(item.id);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    Open <ChevronRight size={16} className="ml-1" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredItems.length === 0 && !loading && (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No items match the filter.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title=""
                maxWidth="max-w-4xl"
            >
                {selectedItemId && (
                    <ManageItemTasks
                        itemId={selectedItemId}
                        onClose={() => {
                            setIsModalOpen(false);
                            loadItems();
                        }}
                        canManageQc={canManageQc}
                        rateCard={rateCard}
                        tailors={tailors}
                    />
                )}
            </Modal>
        </div>
    );
}
