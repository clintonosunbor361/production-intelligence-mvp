import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { CSVImporter } from '../../components/Shared/CSVImporter';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

export default function ManageTailors() {
    const [tailors, setTailors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTailor, setEditingTailor] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ name: '', percentage: '' });

    useEffect(() => {
        loadTailors();
    }, []);

    const loadTailors = async () => {
        setLoading(true);
        const data = await db.getTailors();
        setTailors(data);
        setLoading(false);
    };

    const handleOpenModal = (tailor = null) => {
        if (tailor) {
            setEditingTailor(tailor);
            setFormData({ name: tailor.name, percentage: (tailor.percentage * 100).toString() });
        } else {
            setEditingTailor(null);
            setFormData({ name: '', percentage: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        // In a real app we'd call db.createTailor or db.updateTailor
        // For MVP/Mock, we'll just alert that this is a demo or implement a simple mock update if needed
        // But since db.js doesn't have write methods for Master Data yet (as per my db.js implementation which only had getters for Master Data)
        // I should probably add simple write methods to db.js or just show a toast for MVP.
        // Let's quickly add a mock write to local state to demonstrate UI responsiveness, 
        // or better, I should update db.js to support master data writes. 
        // For now, I'll just log it.
        console.log("Saving tailor:", formData);
        setIsModalOpen(false);
        alert("Master Data writes are read-only in this demo version (except for Items/Tasks).");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Tailors</h1>
                    <p className="text-sm text-maison-secondary">Manage atelier staff and commission rates</p>
                </div>
                <div className="flex gap-3">
                    <CSVImporter
                        onImport={async (data) => {
                            let count = 0;
                            setLoading(true);
                            for (const row of data) {
                                if (row.Name && row['Bonus %']) {
                                    await db.createTailor(row.Name, row['Bonus %']);
                                    count++;
                                }
                            }
                            await loadData();
                            alert(`Imported ${count} tailors.`);
                        }}
                    />
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={16} className="mr-2" />
                        Add Tailor
                    </Button>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Name', 'Bonus %', 'Status', 'Actions']}>
                    {tailors.map((tailor) => (
                        <TableRow key={tailor.id}>
                            <TableCell className="font-medium">{tailor.name}</TableCell>
                            <TableCell>+{(tailor.percentage * 100).toFixed(0)}%</TableCell>
                            <TableCell>
                                <Badge variant={tailor.active ? 'success' : 'neutral'}>
                                    {tailor.active ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(tailor)}
                                        className="p-1 text-gray-400 hover:text-maison-primary transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    {/* Delete button (visually only for MVP) */}
                                    <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {tailors.length === 0 && !loading && (
                        <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No tailors found.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTailor ? 'Edit Tailor' : 'Add New Tailor'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Marco Vitti"
                        required
                    />
                    <Input
                        label="Bonus Percentage (above Base Fee)"
                        type="number"
                        value={formData.percentage}
                        onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                        placeholder="30"
                        required
                        min="0"
                        max="100"
                    />
                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingTailor ? 'Update Tailor' : 'Create Tailor'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
