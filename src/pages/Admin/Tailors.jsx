import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { CSVImporter } from '../../components/Shared/CSVImporter';
import { Plus, Edit2, Trash2, Settings2 } from 'lucide-react';

const DEPARTMENTS = ['PANT', 'SHIRT', 'SUIT', 'KAFTAN', 'ACCESSORIES', 'DESIGN', 'CUTTER', 'OTHER'];

export default function ManageTailors() {
    const [tailors, setTailors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
    const [isSpecialPayModalOpen, setIsSpecialPayModalOpen] = useState(false);

    const [editingTailor, setEditingTailor] = useState(null);

    // Filter data for Special Pay
    const [taskTypes, setTaskTypes] = useState([]);
    const [specialPays, setSpecialPays] = useState([]);

    // Form State (Tailor)
    const [tailorForm, setTailorForm] = useState({
        name: '', department: 'OTHER', base_fee_pct: '', weekly_bonus_pct: '', active: true
    });

    // Form State (Special Pay)
    const [specialPayForm, setSpecialPayForm] = useState({ task_type_id: '', uplift_pct: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [tailorsData, taskTypesData] = await Promise.all([
            db.getTailors(),
            db.getTaskTypes()
        ]);
        setTailors(tailorsData);
        setTaskTypes(taskTypesData);
        setLoading(false);
    };

    const loadSpecialPays = async (tailorId) => {
        const data = await db.getTailorSpecialPay(tailorId);
        setSpecialPays(data);
    };

    // --- Handlers: Tailor ---
    const handleOpenTailorModal = (tailor = null) => {
        if (tailor) {
            setEditingTailor(tailor);
            setTailorForm({
                name: tailor.name,
                department: tailor.department || 'OTHER',
                base_fee_pct: ((tailor.base_fee_pct ?? tailor.percentage ?? 0) * 100).toString(),
                weekly_bonus_pct: ((tailor.weekly_bonus_pct || 0) * 100).toString(),
                active: tailor.active
            });
        } else {
            setEditingTailor(null);
            setTailorForm({ name: '', department: 'OTHER', base_fee_pct: '', weekly_bonus_pct: '', active: true });
        }
        setIsTailorModalOpen(true);
    };

    const handleSaveTailor = async (e) => {
        e.preventDefault();
        try {
            if (editingTailor) {
                await db.updateTailor(editingTailor.id, tailorForm);
            } else {
                await db.createTailor(tailorForm);
            }
            setIsTailorModalOpen(false);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    // --- Handlers: Special Pay ---
    const handleOpenSpecialPayModal = async (tailor) => {
        setEditingTailor(tailor);
        await loadSpecialPays(tailor.id);
        setIsSpecialPayModalOpen(true);
    };

    const handleSaveSpecialPay = async (e) => {
        e.preventDefault();
        if (!specialPayForm.task_type_id) {
            alert("Please select a task type"); return;
        }
        try {
            await db.saveTailorSpecialPay(editingTailor.id, specialPayForm.task_type_id, specialPayForm.uplift_pct);
            setSpecialPayForm({ task_type_id: '', uplift_pct: '' });
            await loadSpecialPays(editingTailor.id);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteSpecialPay = async (id) => {
        if (window.confirm("Remove this special pay rule?")) {
            await db.removeTailorSpecialPay(id);
            await loadSpecialPays(editingTailor.id);
        }
    };

    // --- CSV Import ---
    const handleImportCSV = async (data) => {
        setLoading(true);
        let count = 0;
        let specialPayCount = 0;
        for (const row of data) {
            const name = row['TAILOR NAME'] || row.Name;
            if (name) {
                const newT = await db.createTailor({
                    name,
                    department: row['DEPARTMENT'] || 'OTHER',
                    base_fee_pct: row['BASE FEE%'] || row['Base Fee %'] || row['Bonus %'] || 0,
                    weekly_bonus_pct: row['WEEKLY BONUS%'] || row['Weekly Bonus %'] || 0,
                    active: true
                });
                count++;

                // Handle SPECIAL PAY TASKS (comma separated task names)
                const specialTasksStr = row['SPECIAL PAY TASKS'];
                if (specialTasksStr) {
                    const tasksStrArr = specialTasksStr.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                    for (const ts of tasksStrArr) {
                        const ttObj = taskTypes.find(t => t.name.toLowerCase() === ts.toLowerCase());
                        if (ttObj) {
                            await db.saveTailorSpecialPay(newT.id, ttObj.id, null); // null -> Pending uplift rate
                            specialPayCount++;
                        }
                    }
                }
            }
        }
        await loadData();
        alert(`Imported ${count} tailors and added ${specialPayCount} pending special pay rules.`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Tailors</h1>
                    <p className="text-sm text-maison-secondary">Manage atelier staff, base fees, and weekly bonuses</p>
                </div>
                <div className="flex gap-3">
                    <CSVImporter
                        onImport={handleImportCSV}
                    />
                    <Button onClick={() => handleOpenTailorModal()}>
                        <Plus size={16} className="mr-2" />
                        Add Tailor
                    </Button>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Name', 'Department', 'Base Fee %', 'Weekly Bonus %', 'Status', 'Actions']}>
                    {tailors.map((tailor) => {
                        const basePct = tailor.base_fee_pct !== undefined ? tailor.base_fee_pct : tailor.percentage;
                        const bonusPct = tailor.weekly_bonus_pct || 0;
                        return (
                            <TableRow key={tailor.id}>
                                <TableCell className="font-medium">{tailor.name}</TableCell>
                                <TableCell>{tailor.department}</TableCell>
                                <TableCell>{(basePct * 100).toFixed(0)}%</TableCell>
                                <TableCell>{(bonusPct * 100).toFixed(1)}%</TableCell>
                                <TableCell>
                                    <Badge variant={tailor.active ? 'success' : 'neutral'}>
                                        {tailor.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-3">
                                        <button
                                            title="Manage Special Pay"
                                            onClick={() => handleOpenSpecialPayModal(tailor)}
                                            className="p-1 text-gray-400 hover:text-maison-accent transition-colors"
                                        >
                                            <Settings2 size={16} />
                                        </button>
                                        <button
                                            title="Edit Tailor"
                                            onClick={() => handleOpenTailorModal(tailor)}
                                            className="p-1 text-gray-400 hover:text-maison-primary transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                    {tailors.length === 0 && !loading && (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No tailors found.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>

            {/* TAILOR MODAL */}
            <Modal
                isOpen={isTailorModalOpen}
                onClose={() => setIsTailorModalOpen(false)}
                title={editingTailor ? 'Edit Tailor' : 'Add New Tailor'}
            >
                <form onSubmit={handleSaveTailor} className="space-y-4">
                    <Input
                        label="Full Name"
                        value={tailorForm.name}
                        onChange={(e) => setTailorForm({ ...tailorForm, name: e.target.value })}
                        placeholder="e.g. Marco Vitti"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Department</label>
                        <select
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                            value={tailorForm.department}
                            onChange={(e) => setTailorForm({ ...tailorForm, department: e.target.value })}
                            required
                        >
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Base Fee %"
                            type="number"
                            value={tailorForm.base_fee_pct}
                            onChange={(e) => setTailorForm({ ...tailorForm, base_fee_pct: e.target.value })}
                            placeholder="30"
                            required
                            min="0"
                            max="100"
                        />
                        <Input
                            label="Weekly Bonus %"
                            type="number"
                            value={tailorForm.weekly_bonus_pct}
                            onChange={(e) => setTailorForm({ ...tailorForm, weekly_bonus_pct: e.target.value })}
                            placeholder="5"
                            required
                            min="0"
                            max="100"
                            step="0.1"
                        />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            id="activeTailor"
                            checked={tailorForm.active}
                            onChange={(e) => setTailorForm({ ...tailorForm, active: e.target.checked })}
                            className="rounded border-gray-300 text-maison-primary focus:ring-maison-primary"
                        />
                        <label htmlFor="activeTailor" className="text-sm font-medium text-maison-secondary">Active Status</label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsTailorModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingTailor ? 'Update Tailor' : 'Create Tailor'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* SPECIAL PAY MODAL */}
            <Modal
                isOpen={isSpecialPayModalOpen}
                onClose={() => setIsSpecialPayModalOpen(false)}
                title={`Manage Special Pay - ${editingTailor?.name}`}
            >
                <div className="space-y-6">
                    <form onSubmit={handleSaveSpecialPay} className="flex items-end gap-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Task Type</label>
                            <select
                                className="block w-full rounded border-gray-200 shadow-sm text-sm"
                                value={specialPayForm.task_type_id}
                                onChange={(e) => setSpecialPayForm({ ...specialPayForm, task_type_id: e.target.value })}
                                required
                            >
                                <option value="">Select Task...</option>
                                {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Uplift %</label>
                            <input
                                type="number"
                                className="block w-full rounded border-gray-200 shadow-sm text-sm"
                                placeholder="e.g. 50"
                                value={specialPayForm.uplift_pct}
                                onChange={(e) => setSpecialPayForm({ ...specialPayForm, uplift_pct: e.target.value })}
                            />
                        </div>
                        <Button type="submit" size="sm">Add</Button>
                    </form>

                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <Table headers={['Task Type', 'Uplift Rate', 'Actions']}>
                            {specialPays.map(sp => {
                                const taskType = taskTypes.find(t => t.id === sp.task_type_id);
                                const isPending = sp.uplift_pct === null;
                                return (
                                    <TableRow key={sp.id}>
                                        <TableCell className={isPending ? "text-gray-500 font-medium" : "font-medium"}>
                                            {taskType ? taskType.name : 'Unknown Task'}
                                        </TableCell>
                                        <TableCell>
                                            {isPending ? (
                                                <Badge variant="warning">Needs Uplift Rate</Badge>
                                            ) : (
                                                `${(sp.uplift_pct * 100).toFixed(0)}%`
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {isPending && (
                                                    <button onClick={() => {
                                                        setSpecialPayForm({ task_type_id: sp.task_type_id, uplift_pct: '' });
                                                    }} className="text-xs text-maison-accent hover:underline">
                                                        Set Rate
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeleteSpecialPay(sp.id)} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {specialPays.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-4 py-6 text-center text-gray-500 text-sm">
                                        No special pay rules defined.
                                    </td>
                                </tr>
                            )}
                        </Table>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
