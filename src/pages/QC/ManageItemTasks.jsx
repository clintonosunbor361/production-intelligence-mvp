import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { ArrowLeft, Plus, CheckCircle2 } from 'lucide-react';

export default function ManageItemTasks() {
    const { itemId } = useParams();
    const navigate = useNavigate();

    const [item, setItem] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Task Creation Context
    const [rateCard, setRateCard] = useState([]);
    const [categories, setCategories] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [tailors, setTailors] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        category_id: '',
        task_type_id: '',
        tailor_id: '',
    });

    useEffect(() => {
        loadData();
    }, [itemId]);

    const loadData = async () => {
        setLoading(true);
        const [i, allItems] = await Promise.all([
            db.getItems().then(items => items.find(x => x.id === itemId)),
            db.getItems() // Re-fetch to be safe if `getItems` signature changes, but here we used `find` on array.
            // Actually db.getItems returns all enriched, so the first call is enough.
        ]);

        // Safety check if item not found
        if (!i) {
            alert("Item not found");
            navigate('/qc');
            return;
        }

        setItem(i);

        const [t, rc, cat, tt, tail] = await Promise.all([
            db.getTasksByItemId(itemId),
            db.getRateCard(),
            db.getCategories(),
            db.getTaskTypes(),
            db.getTailors()
        ]);

        // Enrich tasks
        const enrichedTasks = t.map(task => {
            const tailor = tail.find(x => x.id === task.tailor_id);
            const catObj = cat.find(x => x.id === task.category_id);
            const ttObj = tt.find(x => x.id === task.task_type_id);
            return { ...task, tailor_name: tailor?.name, category_name: catObj?.name, task_type_name: ttObj?.name };
        });

        setTasks(enrichedTasks);
        setRateCard(rc);
        setCategories(cat);
        setTaskTypes(tt);
        setTailors(tail);
        setLoading(false);
    };

    // --- Derived Dropdown Options ---

    // 1. Available Categories: Only those present in RateCard for this Product Type
    const availableCategories = categories.filter(c =>
        rateCard.some(r => r.product_type_id === item?.product_type_id && r.category_id === c.id)
    );

    // 2. Available Task Types: Filter by Product Type AND Selected Category
    const availableTaskTypes = taskTypes.filter(tt =>
        tt.product_type_id === item?.product_type_id &&
        tt.category_id === newTask.category_id
    );

    // --- Rate Calculation for Display ---
    const selectedRate = rateCard.find(r =>
        r.product_type_id === item?.product_type_id &&
        r.category_id === newTask.category_id &&
        r.task_type_id === newTask.task_type_id
    );

    const selectedTailor = tailors.find(t => t.id === newTask.tailor_id);

    const calculatedPay = (selectedRate && selectedTailor)
        ? (selectedRate.base_fee * (1 + selectedTailor.percentage)).toFixed(2)
        : '0.00';


    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!selectedRate) {
            alert("Invalid Rate Configuration");
            return;
        }

        try {
            await db.createTask({
                item_id: item.id,
                product_type_id: item.product_type_id, // Needed for backend verify
                category_id: newTask.category_id,
                task_type_id: newTask.task_type_id,
                tailor_id: newTask.tailor_id
            });
            setIsModalOpen(false);
            loadData(); // Refresh
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading || !item) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
                    <ArrowLeft size={16} className="mr-2" /> Back to Queue
                </Button>
            </div>

            {/* Item Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-serif text-maison-primary flex items-center gap-3">
                        {item.item_key}
                        <Badge variant="neutral">{item.product_type_name}</Badge>
                    </h1>
                    <p className="text-sm text-maison-secondary mt-1">
                        Ticket: {item.ticket_id} | Customer: {item.customer_name}
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={16} className="mr-2" /> Assign Task
                </Button>
            </div>

            <Card padding="p-0">
                <Table headers={['Category', 'Task', 'Tailor', 'Est. Pay', 'Status', 'Verified By']}>
                    {tasks.map(task => (
                        <TableRow key={task.id}>
                            <TableCell>{task.category_name}</TableCell>
                            <TableCell className="font-medium">{task.task_type_name}</TableCell>
                            <TableCell>{task.tailor_name}</TableCell>
                            <TableCell>₦{parseFloat(task.tailor_pay).toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={task.verification_status === 'Verified' ? 'success' : task.verification_status === 'Rejected' ? 'danger' : 'warning'}>
                                    {task.verification_status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                                {task.verified_by_role || '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                    {tasks.length === 0 && (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No tasks assigned yet.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Assign Tailor Task"
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Category</label>
                        <select
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                            value={newTask.category_id}
                            onChange={e => setNewTask({ ...newTask, category_id: e.target.value, task_type_id: '' })} // Reset task type on cat change
                            required
                        >
                            <option value="">Select Category...</option>
                            {availableCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Task Type</label>
                        <select
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                            value={newTask.task_type_id}
                            onChange={e => setNewTask({ ...newTask, task_type_id: e.target.value })}
                            required
                            disabled={!newTask.category_id}
                        >
                            <option value="">Select Task...</option>
                            {availableTaskTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Tailor</label>
                        <select
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                            value={newTask.tailor_id}
                            onChange={e => setNewTask({ ...newTask, tailor_id: e.target.value })}
                            required
                        >
                            <option value="">Select Tailor...</option>
                            {tailors.filter(t => t.active).map(t => (
                                <option key={t.id} value={t.id}>{t.name} (Bonus: +{Math.round(t.percentage * 100)}%)</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">Base Fee:</span>
                            <span className="font-medium">
                                ₦{selectedRate ? selectedRate.base_fee.toFixed(2) : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">Bonus:</span>
                            <span className="font-medium">
                                {selectedTailor ? `+${(selectedTailor.percentage * 100).toFixed(0)}%` : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-maison-primary pt-2 border-t border-gray-200 mt-2">
                            <span>Total Pay:</span>
                            <span>₦{calculatedPay}</span>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Assign Task</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
