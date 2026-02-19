import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { CSVImporter } from '../../components/Shared/CSVImporter';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function ManageTaskTypes() {
    const [tasks, setTasks] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rates, setRates] = useState([]);

    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [formData, setFormData] = useState({
        product_type_id: '',
        category_id: '',
        name: '',
        base_fee: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [t, pt, cat, r] = await Promise.all([
            db.getTaskTypes(),
            db.getProductTypes(),
            db.getCategories(),
            db.getRateCard()
        ]);

        // Merge data for display
        const enrichedTasks = t.map(task => {
            const p = pt.find(x => x.id === task.product_type_id);
            const c = cat.find(x => x.id === task.category_id);
            const rate = r.find(x =>
                x.task_type_id === task.id &&
                x.product_type_id === task.product_type_id &&
                x.category_id === task.category_id
            );

            return {
                ...task,
                product_name: p ? p.name : 'Unknown',
                category_name: c ? c.name : 'Unknown',
                base_fee: rate ? rate.base_fee : 0
            };
        });

        setTasks(enrichedTasks);
        setProductTypes(pt);
        setCategories(cat);
        setRates(r);
        setLoading(false);
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                product_type_id: item.product_type_id,
                category_id: item.category_id,
                name: item.name,
                base_fee: item.base_fee
            });
        } else {
            setEditingItem(null);
            setFormData({
                product_type_id: productTypes[0]?.id || '',
                category_id: categories[0]?.id || '',
                name: '',
                base_fee: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        console.log("Saving Task Type & Rate:", formData);
        setIsModalOpen(false);
        alert("Master Data writes are read-only in this demo version.");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Task Rates</h1>
                    <p className="text-sm text-maison-secondary">Configure tasks and base fees per product/category</p>
                </div>
                <div className="flex gap-3">
                    <CSVImporter
                        onImport={async (data) => {
                            let count = 0;
                            setLoading(true);
                            for (const row of data) {
                                // Product, Category, Task Name, Base Fee
                                const productName = row.Product;
                                const categoryName = row.Category;
                                const taskName = row['Task Name'];
                                const baseFee = row['Base Fee'];

                                if (productName && categoryName && taskName && baseFee) {
                                    await db.createTaskAndRate(productName, categoryName, taskName, baseFee);
                                    count++;
                                }
                            }
                            await loadData();
                            alert(`Imported ${count} task rates.`);
                        }}
                    />
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={16} className="mr-2" />
                        Add Task Type
                    </Button>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Product', 'Category', 'Task Name', 'Base Fee', 'Status', 'Actions']}>
                    {tasks.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.category_name}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>₦{parseFloat(item.base_fee).toFixed(2)}</TableCell>
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
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Edit Task Rate' : 'Add Task Rate'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Product Type</label>
                        <select
                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-maison-accent focus:ring-maison-accent sm:text-sm py-2.5"
                            value={formData.product_type_id}
                            onChange={(e) => setFormData({ ...formData, product_type_id: e.target.value })}
                            disabled={!!editingItem} // Lock context on edit
                        >
                            {productTypes.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Category</label>
                        <select
                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-maison-accent focus:ring-maison-accent sm:text-sm py-2.5"
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            disabled={!!editingItem} // Lock context on edit
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Task Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Sleeve Amendment"
                        required
                    />

                    <Input
                        label="Base Fee (₦)"
                        type="number"
                        value={formData.base_fee}
                        onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
                        placeholder="50.00"
                        required
                        min="0"
                        step="0.01"
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
