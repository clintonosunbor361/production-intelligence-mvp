import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function ManageProductTypes() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [formData, setFormData] = useState({ name: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await db.getProductTypes();
        setItems(data);
        setLoading(false);
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name });
        } else {
            setEditingItem(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        console.log("Saving Product Type:", formData);
        setIsModalOpen(false);
        alert("Master Data writes are read-only in this demo version.");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Product Types</h1>
                    <p className="text-sm text-maison-secondary">Define garment types (Suit, Cape, etc.)</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus size={16} className="mr-2" />
                    Add Product Type
                </Button>
            </div>

            <Card padding="p-0">
                <Table headers={['Name', 'Status', 'Actions']}>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                                <Badge variant={item.active ? 'success' : 'neutral'}>
                                    {item.active ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(item)}
                                        className="p-1 text-gray-400 hover:text-maison-primary transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Edit Product Type' : 'Add Product Type'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Suit"
                        required
                    />
                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingItem ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
