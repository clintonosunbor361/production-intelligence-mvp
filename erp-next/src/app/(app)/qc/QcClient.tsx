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
        // For QC, we typically want to see Active items, not CANCELLED
        setItems(data.filter(i => i.status !== 'CANCELLED'));
        setRateCard(rc);
        setTailors(t);
        setLoading(false);
    };

    const filteredItems = items.filter(item => {
        if (filter === 'in_production') return item.status === 'IN_PRODUCTION';
        if (filter === 'in_qc') return item.status === 'IN_QC';
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
                        onClick={() => setFilter('in_production')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'in_production' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        New Items
                    </button>
                    <button
                        onClick={() => setFilter('in_qc')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'in_qc' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Assigned
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
                <Table headers={['Ticket ID', 'Customer Name', 'Product Type', 'Status', 'Assigned Date']}>
                    {filteredItems.map((item) => {
                        const assignedCategories = item.work_assignments?.map((wa: any) => wa.category_types?.name).filter(Boolean) || [];
                        const uniqueCategories = [...new Set(assignedCategories)];

                        return (
                            <TableRow
                                key={item.id}
                                onClick={() => { setSelectedItemId(item.id); setIsModalOpen(true); }}
                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <TableCell className="font-medium font-mono text-xs">{item.ticket_number}</TableCell>
                                <TableCell className="font-medium">{item.customer_name}</TableCell>
                                <TableCell>{item.product_type_name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 items-start">
                                        <div className="flex gap-2">
                                            <Badge variant={item.status === 'IN_PRODUCTION' ? 'brand' : (item.status === 'IN_QC' ? 'warning' : 'neutral')}>{item.status}</Badge>
                                            {item.needs_qc_attention && <Badge variant="warning">Check</Badge>}
                                        </div>
                                        {uniqueCategories.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                <Badge variant="neutral">{uniqueCategories[0] as string}</Badge>
                                                {uniqueCategories.length > 1 && <Badge variant="neutral">+{uniqueCategories.length - 1}</Badge>}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-500">
                                    {item.assigned_date ? format(new Date(item.assigned_date), 'MMM d') : '-'}
                                </TableCell>
                            </TableRow>
                        )
                    })}
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
