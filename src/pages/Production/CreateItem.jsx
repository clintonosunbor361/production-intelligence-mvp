import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { useAuth, ROLES } from '../../context/AuthContext';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateItem() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [productTypes, setProductTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    const [ticketData, setTicketData] = useState({
        ticket_id: '',
        customer_name: '',
        notes: ''
    });

    const [items, setItems] = useState([
        { id: Date.now(), product_type_id: '', quantity: 1 }
    ]);

    useEffect(() => {
        db.getProductTypes().then(setProductTypes);
    }, [user]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), product_type_id: '', quantity: 1 }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        const validItems = items.filter(i => i.product_type_id);
        if (validItems.length === 0) {
            alert("Please select at least one product type");
            return;
        }

        setLoading(true);
        try {
            // Create items sequentially to ensure DB updates correctly
            for (const item of validItems) {
                await db.createItem({
                    ticket_id: ticketData.ticket_id,
                    customer_name: ticketData.customer_name,
                    notes: ticketData.notes,
                    product_type_id: item.product_type_id,
                    quantity: item.quantity,
                    created_by_role: user?.role || 'unknown'
                });
            }
            navigate('/production'); // Go back to list
        } catch (err) {
            console.error(err);
            alert("Error creating items");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/production')}>
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <h1 className="text-2xl font-serif text-maison-primary">Create Production Items</h1>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Ticket ID"
                            placeholder="e.g. TCK-9021"
                            value={ticketData.ticket_id}
                            onChange={e => setTicketData({ ...ticketData, ticket_id: e.target.value })}
                            required
                        />

                        <Input
                            label="Customer Name"
                            placeholder="e.g. Client Name"
                            value={ticketData.customer_name}
                            onChange={e => setTicketData({ ...ticketData, customer_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-maison-primary">Products</h2>
                            <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                                <Plus size={16} className="mr-2" /> Add Product
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="flex items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Product Type</label>
                                        <select
                                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-maison-accent focus:ring-maison-accent sm:text-sm py-2.5"
                                            value={item.product_type_id}
                                            onChange={e => handleItemChange(item.id, 'product_type_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select Type...</option>
                                            {productTypes.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="w-24">
                                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Qty</label>
                                        <input
                                            type="number"
                                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-maison-accent focus:ring-maison-accent sm:text-sm py-2.5"
                                            min="1"
                                            max="50"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                            required
                                        />
                                    </div>

                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="p-2.5 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-lg border border-gray-200 hover:border-red-200 shadow-sm mb-px"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <Input
                            label="Master Notes (Optional, applies to all items in this ticket)"
                            value={ticketData.notes}
                            onChange={e => setTicketData({ ...ticketData, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button type="submit" isLoading={loading}>
                            Create {items.length} {items.length === 1 ? 'Product' : 'Products'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
