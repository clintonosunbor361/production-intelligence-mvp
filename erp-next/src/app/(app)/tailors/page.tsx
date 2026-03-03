// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/services/db';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table';
import { Modal } from '@/components/UI/Modal';
import { Input } from '@/components/UI/Input';
import { CSVImporter } from '@/components/Shared/CSVImporter';
import { Plus, Edit2, Power, PowerOff } from 'lucide-react';

const DEPARTMENTS = ['PANT', 'SHIRT', 'SUIT', 'KAFTAN', 'ACCESSORIES', 'DESIGN', 'CUTTER', 'OTHER'];

export default function ManageTailors() {
    const [tailors, setTailors] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
    const [editingTailor, setEditingTailor] = useState(null);

    const [tailorForm, setTailorForm] = useState({
        name: '', department: 'OTHER', band: 'A', active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const tailorsData = await db.getTailors();
        setTailors(tailorsData);
        setLoading(false);
    };

    const handleOpenTailorModal = (tailor = null) => {
        if (tailor) {
            setEditingTailor(tailor);
            setTailorForm({
                name: tailor.name,
                department: tailor.department || 'OTHER',
                band: tailor.band || 'A',
                active: tailor.active
            });
        } else {
            setEditingTailor(null);
            setTailorForm({ name: '', department: 'OTHER', band: 'A', active: true });
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

    const handleToggleStatus = async (tailor) => {
        const action = tailor.active ? 'deactivate' : 'activate';
        if (tailor.active && !window.confirm(`Are you sure you want to ${action} ${tailor.name}? They will no longer appear in assignment dropdowns.`)) {
            return;
        }

        try {
            await db.toggleTailorStatus(tailor.id);
            await loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleImportCSV = async (data) => {
        setLoading(true);
        let count = 0;
        for (const row of data) {
            const name = row['TAILOR NAME'] || row.Name;
            if (name) {
                await db.createTailor({
                    name,
                    department: row['DEPARTMENT'] || 'OTHER',
                    band: row['BAND'] || row['Band'] || 'A',
                    active: true
                });
                count++;
            }
        }
        await loadData();
        alert(`Imported ${count} tailors with Band configurations.`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Tailors</h1>
                    <p className="text-sm text-maison-secondary">Manage atelier staff, departments, and pay bands</p>
                </div>
                <div className="flex gap-3">
                    <CSVImporter onImport={handleImportCSV} />
                    <Button onClick={() => handleOpenTailorModal()}>
                        <Plus size={16} className="mr-2" />
                        Add Tailor
                    </Button>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Name', 'Department', 'Band', 'Status', 'Actions']}>
                    {tailors.map((tailor) => {
                        return (
                            <TableRow key={tailor.id}>
                                <TableCell className="font-medium">{tailor.name}</TableCell>
                                <TableCell>{tailor.department}</TableCell>
                                <TableCell>
                                    <Badge variant={(tailor.band || 'A') === 'B' ? 'warning' : 'neutral'}>
                                        Band {tailor.band || 'A'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={tailor.active ? 'success' : 'neutral'}>
                                        {tailor.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-3">
                                        <button
                                            title={tailor.active ? "Deactivate Tailor" : "Activate Tailor"}
                                            onClick={() => handleToggleStatus(tailor)}
                                            className={`p-1 transition-colors ${tailor.active ? 'text-gray-400 hover:text-red-500' : 'text-red-400 hover:text-green-500'}`}
                                        >
                                            {tailor.active ? <PowerOff size={16} /> : <Power size={16} />}
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
                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No tailors found.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>

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

                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Pay Band</label>
                        <select
                            className="block w-full rounded-lg border-gray-200 shadow-sm sm:text-sm py-2.5"
                            value={tailorForm.band}
                            onChange={(e) => setTailorForm({ ...tailorForm, band: e.target.value })}
                            required
                        >
                            <option value="A">Band A (Standard)</option>
                            <option value="B">Band B (Senior)</option>
                        </select>
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
        </div>
    );
}
