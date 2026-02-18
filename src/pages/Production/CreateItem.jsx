import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { useAuth, ROLES } from '../../context/AuthContext';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateItem() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [productTypes, setProductTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        ticket_id: '',
        customer_name: '',
        product_type_id: '',
        quantity: 1,
        notes: ''
    });

    useEffect(() => {
        // Check permission
        if (user && user.role !== ROLES.PRODUCTION && user.role !== ROLES.ADMIN) {
            // Ideally redirect or show distinct message, but for MVP just letting them see it
        }

        db.getProductTypes().then(setProductTypes);
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.product_type_id) {
            alert("Please select a product type");
            return;
        }

        setLoading(true);
        try {
            await db.createItem({
                ...formData,
                created_by_role: user?.role || 'unknown'
            });
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
                    <Input
                        label="Ticket ID"
                        placeholder="e.g. TCK-9021"
                        value={formData.ticket_id}
                        onChange={e => setFormData({ ...formData, ticket_id: e.target.value })}
                        required
                    />

                    <Input
                        label="Customer Name"
                        placeholder="e.g. Client Name"
                        value={formData.customer_name}
                        onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-maison-secondary mb-1.5">Product Type</label>
                            <select
                                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-maison-accent focus:ring-maison-accent sm:text-sm py-2.5"
                                value={formData.product_type_id}
                                onChange={e => setFormData({ ...formData, product_type_id: e.target.value })}
                                required
                            >
                                <option value="">Select Type...</option>
                                {productTypes.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label="Quantity"
                            type="number"
                            min="1"
                            max="50"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                            required
                        />
                    </div>

                    <Input
                        label="Notes (Optional)"
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" isLoading={loading}>
                            Create Items
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
