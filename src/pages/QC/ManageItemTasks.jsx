import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { ArrowLeft, Plus, CheckCircle2 } from 'lucide-react';

export default function ManageItemTasks({ itemId: propItemId, onClose }) {
    const params = useParams();
    const itemId = propItemId || params.itemId;
    const navigate = useNavigate();

    const [item, setItem] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Task Creation Context
    const [rateCard, setRateCard] = useState([]);
    const [categories, setCategories] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [tailors, setTailors] = useState([]);
    const [specialPays, setSpecialPays] = useState([]);

    // Form State
    const [showAssignForm, setShowAssignForm] = useState(false);
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

        // Fetch special pays for all tailors
        const specialPaysPromises = tail.map(t => db.getTailorSpecialPay(t.id));
        const specialPaysResults = await Promise.all(specialPaysPromises);
        const allSpecialPays = specialPaysResults.flat();

        setTasks(enrichedTasks);
        setRateCard(rc);
        setCategories(cat);
        setTaskTypes(tt);
        setTailors(tail);
        setSpecialPays(allSpecialPays);
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

    // Active uplift calculation based on overrides vs base
    let activeUplift = 0;
    let isOverride = false;

    if (selectedTailor) {
        activeUplift = selectedTailor.base_fee_pct !== undefined ? selectedTailor.base_fee_pct : selectedTailor.percentage;

        const specialPay = specialPays.find(sp =>
            sp.tailor_id === selectedTailor.id &&
            sp.task_type_id === newTask.task_type_id
        );

        if (specialPay && specialPay.uplift_pct !== null) {
            activeUplift = specialPay.uplift_pct;
            isOverride = true;
        }
    }

    const calculatedPay = (selectedRate && selectedTailor)
        ? (selectedRate.base_fee * (1 + activeUplift)).toFixed(2)
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
            setShowAssignForm(false);
            loadData(); // Refresh
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading || !item) return <div>Loading...</div>;

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate('/qc');
        }
    };

    return (
        <div className="space-y-6">
            {!onClose && (
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                        <ArrowLeft size={16} className="mr-2" /> Back to Queue
                    </Button>
                </div>
            )}

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
                <Button onClick={() => setShowAssignForm(!showAssignForm)}>
                    <Plus size={16} className="mr-2" /> Assign Task
                </Button>
            </div>

            {showAssignForm && (
                <Card className="border-maison-accent/20 bg-maison-accent/5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-maison-primary">Assign New Task</h3>
                    </div>

                    {availableCategories.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm mb-4">
                            <strong>No tasks available.</strong> There are currently no Rate Cards configured for this Product Type ({item.product_type_name}). Please go to <strong>Settings &gt; Task Types & Rates</strong> to configure them first.
                        </div>
                    ) : (
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-maison-secondary mb-1.5">Category</label>
                                    <select
                                        className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                                        value={newTask.category_id}
                                        onChange={e => setNewTask({ ...newTask, category_id: e.target.value, task_type_id: '' })}
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
                                        {tailors.filter(t => t.active).map(t => {
                                            const basePct = t.base_fee_pct !== undefined ? t.base_fee_pct : t.percentage;
                                            return (
                                                <option key={t.id} value={t.id}>{t.name} (Base: +{(basePct * 100).toFixed(0)}%)</option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Summary Box */}
                            <div className="bg-white p-4 rounded-lg border border-gray-100 mt-4 shadow-sm">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Base Fee:</span>
                                    <span className="font-medium">
                                        ₦{selectedRate ? selectedRate.base_fee.toFixed(2) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Uplift Applied:</span>
                                    <span className="font-medium flex items-center gap-2">
                                        {selectedTailor ? `+${(activeUplift * 100).toFixed(0)}%` : '-'}
                                        {isOverride && <Badge variant="warning">Special Override</Badge>}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-maison-primary pt-2 border-t border-gray-100 mt-2">
                                    <span>Total Pay:</span>
                                    <span>₦{calculatedPay}</span>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={() => setShowAssignForm(false)}>Cancel</Button>
                                <Button type="submit">Assign Task</Button>
                            </div>
                        </form>
                    )}
                </Card>
            )}

            <Card padding="p-0">
                <Table headers={['Category', 'Task', 'Tailor', 'Est. Pay', 'Status', 'Verified By']}>
                    {tasks.map(task => (
                        <TableRow key={task.id}>
                            <TableCell>{task.category_name}</TableCell>
                            <TableCell className="font-medium">{task.task_type_name}</TableCell>
                            <TableCell>{task.tailor_name}</TableCell>
                            <TableCell>₦{parseFloat(task.tailor_pay).toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={task.verification_status === 'Approved' ? 'success' : task.verification_status === 'Rejected' ? 'danger' : 'warning'}>
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
        </div >
    );
}
