'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table'
import { Modal } from '@/components/UI/Modal'
import { Input } from '@/components/UI/Input'
import { Plus, Edit2 } from 'lucide-react'
import { upsertTailorAction } from '@/app/actions/spine'

export default function ManageTailors() {
    const supabase = createClient()

    const [tailors, setTailors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({ name: '', band: 'A' as 'A' | 'B', active: true })

    const load = useCallback(async () => {
        const { data } = await supabase.from('tailors').select('*').order('name')
        setTailors(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const openModal = (tailor?: any) => {
        if (tailor) {
            setEditing(tailor)
            setForm({ name: tailor.name, band: tailor.band, active: tailor.active })
        } else {
            setEditing(null)
            setForm({ name: '', band: 'A', active: true })
        }
        setError('')
        setModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            await upsertTailorAction({ ...form, id: editing?.id })
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
                    <h1 className="text-2xl font-serif text-maison-primary">Tailors</h1>
                    <p className="text-sm text-maison-secondary">Manage atelier staff and pay bands</p>
                </div>
                <Button onClick={() => openModal()}>
                    <Plus size={16} className="mr-2" /> Add Tailor
                </Button>
            </div>

            <Card padding="p-0">
                <Table headers={['Name', 'Band', 'Status', 'Actions']}>
                    {tailors.map(t => (
                        <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.name}</TableCell>
                            <TableCell>
                                <Badge variant={t.band === 'A' ? 'brand' : 'neutral'}>Band {t.band}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={t.active ? 'success' : 'neutral'}>
                                    {t.active ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <button
                                    onClick={() => openModal(t)}
                                    className="p-1.5 text-gray-400 hover:text-maison-primary hover:bg-gray-100 rounded transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {tailors.length === 0 && !loading && (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">No tailors yet.</td>
                        </tr>
                    )}
                </Table>
            </Card>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Tailor' : 'Add Tailor'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Name"
                        value={form.name}
                        onChange={(e: any) => setForm(p => ({ ...p, name: e.target.value }))}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">Pay Band</label>
                        <select
                            value={form.band}
                            onChange={(e) => setForm(p => ({ ...p, band: e.target.value as 'A' | 'B' }))}
                            className="block w-full rounded-lg border border-gray-200 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                        >
                            <option value="A">Band A (Standard)</option>
                            <option value="B">Band B (Senior)</option>
                        </select>
                    </div>
                    {editing && (
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="active"
                                checked={form.active}
                                onChange={(e) => setForm(p => ({ ...p, active: e.target.checked }))}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="active" className="text-sm text-gray-600">Active</label>
                        </div>
                    )}
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
