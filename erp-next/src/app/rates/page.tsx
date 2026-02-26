'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableRow, TableCell } from '@/components/UI/Table'
import { Modal } from '@/components/UI/Modal'
import { Input } from '@/components/UI/Input'
import { Plus, Edit2 } from 'lucide-react'
import { upsertRateCardAction } from '@/app/actions/spine'

export default function ManageRates() {
    const supabase = createClient()

    const [rates, setRates] = useState<any[]>([])
    const [productTypes, setProductTypes] = useState<any[]>([])
    const [taskTypes, setTaskTypes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        taskTypeId: '',
        productTypeId: '',
        bandAFee: '',
        bandBFee: '',
    })

    const load = useCallback(async () => {
        const [{ data: r }, { data: pt }, { data: tt }] = await Promise.all([
            supabase
                .from('rate_cards')
                .select(`id, band_a_fee, band_b_fee, task_types(id, name), product_types(id, name)`)
                .order('created_at', { ascending: false }),
            supabase.from('product_types').select('id, name').order('name'),
            supabase.from('task_types').select('id, name').order('name'),
        ])
        setRates(r ?? [])
        setProductTypes(pt ?? [])
        setTaskTypes(tt ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const openModal = (rate?: any) => {
        if (rate) {
            setEditing(rate)
            setForm({
                taskTypeId: (rate.task_types as any)?.id ?? '',
                productTypeId: (rate.product_types as any)?.id ?? '',
                bandAFee: String(rate.band_a_fee),
                bandBFee: String(rate.band_b_fee),
            })
        } else {
            setEditing(null)
            setForm({
                taskTypeId: taskTypes[0]?.id ?? '',
                productTypeId: productTypes[0]?.id ?? '',
                bandAFee: '',
                bandBFee: '',
            })
        }
        setError('')
        setModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            await upsertRateCardAction({
                taskTypeId: form.taskTypeId,
                productTypeId: form.productTypeId,
                bandAFee: parseFloat(form.bandAFee),
                bandBFee: parseFloat(form.bandBFee),
                id: editing?.id,
            })
            setModalOpen(false)
            await load()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Rate Cards</h1>
                    <p className="text-sm text-maison-secondary">Base fees per task type and product — Band A (Standard) and Band B (Senior)</p>
                </div>
                <Button onClick={() => openModal()}>
                    <Plus size={16} className="mr-2" /> Add Rate
                </Button>
            </div>

            <Card padding="p-0">
                <Table headers={['Task Type', 'Product Type', 'Band A Fee', 'Band B Fee', 'Actions']}>
                    {rates.map(rate => (
                        <TableRow key={rate.id}>
                            <TableCell className="font-medium">{(rate.task_types as any)?.name}</TableCell>
                            <TableCell>{(rate.product_types as any)?.name}</TableCell>
                            <TableCell className="font-mono">₦{Number(rate.band_a_fee).toFixed(2)}</TableCell>
                            <TableCell className="font-mono">₦{Number(rate.band_b_fee).toFixed(2)}</TableCell>
                            <TableCell>
                                <button
                                    onClick={() => openModal(rate)}
                                    className="p-1.5 text-gray-400 hover:text-maison-primary hover:bg-gray-100 rounded transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {rates.length === 0 && !loading && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                                No rate cards yet. Add task types and product types first.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rate' : 'Add Rate'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Task Type</label>
                        <select
                            required
                            disabled={!!editing}
                            value={form.taskTypeId}
                            onChange={e => setForm(p => ({ ...p, taskTypeId: e.target.value }))}
                            className="block w-full rounded-lg border border-gray-200 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white disabled:bg-gray-50"
                        >
                            <option value="">Select Task Type…</option>
                            {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Product Type</label>
                        <select
                            required
                            disabled={!!editing}
                            value={form.productTypeId}
                            onChange={e => setForm(p => ({ ...p, productTypeId: e.target.value }))}
                            className="block w-full rounded-lg border border-gray-200 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white disabled:bg-gray-50"
                        >
                            <option value="">Select Product Type…</option>
                            {productTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Band A Fee (₦)"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={form.bandAFee}
                            onChange={(e: any) => setForm(p => ({ ...p, bandAFee: e.target.value }))}
                            placeholder="e.g. 2500.00"
                        />
                        <Input
                            label="Band B Fee (₦)"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={form.bandBFee}
                            onChange={(e: any) => setForm(p => ({ ...p, bandBFee: e.target.value }))}
                            placeholder="e.g. 3000.00"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
