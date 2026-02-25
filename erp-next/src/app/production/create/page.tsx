// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/services/db';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { ArrowLeft } from 'lucide-react';

export default function CreateItem() {
    const router = useRouter();
    const [productTypes, setProductTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState<any>({
        ticket_id: '',
        customer_name: '',
        product_type_id: '',
        notes: '',
        quantity: 1
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const pt = await db.getProductTypes();
        setProductTypes(pt.filter((p: any) => p.active));
        setLoading(false);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            await db.createItem(formData);
            router.push('/production');
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => router.push('/production')}>
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Log New Production Items</h1>
                    <p className="text-sm text-maison-secondary">Enter ticket details to generate items for the atelier.</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-maison-secondary mb-1.5">Ticket ID (Optional)</label>
                            <input
                                type="text"
                                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                                placeholder="e.g. ORD-2026"
                                value={formData.ticket_id}
                                onChange={(e: any) => setFormData({ ...formData, ticket_id: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-maison-secondary mb-1.5">Customer Name / Reference</label>
                            <input
                                type="text"
                                required
                                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                                placeholder="Client name"
                                value={formData.customer_name}
                                onChange={(e: any) => setFormData({ ...formData, customer_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Product Type</label>
                        <select
                            required
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                            value={formData.product_type_id}
                            onChange={(e: any) => setFormData({ ...formData, product_type_id: e.target.value })}
                        >
                            <option value="">Select Product...</option>
                            {productTypes.map((pt) => (
                                <option key={pt.id} value={pt.id}>{pt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-maison-secondary mb-1.5">Quantity to Generate</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                required
                                className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                                value={formData.quantity}
                                onChange={(e: any) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                            />
                            <p className="mt-1 text-xs text-gray-500">This will create {formData.quantity} separate items to track.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Internal Notes (Optional)</label>
                        <textarea
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                            rows={3}
                            placeholder="Any special instructions"
                            value={formData.notes}
                            onChange={(e: any) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => router.push('/production')}>Cancel</Button>
                        <Button type="submit">Generate Items</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
