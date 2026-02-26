'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableRow, TableCell } from '@/components/UI/Table'
import { Modal } from '@/components/UI/Modal'
import { Input } from '@/components/UI/Input'
import { Plus, Edit2 } from 'lucide-react'
import { upsertTaskTypeAction } from '@/app/actions/spine'
import { format } from 'date-fns'

export default function ManageTaskTypes() {
    const supabase = createClient()

    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        const { data } = await supabase.from('task_types').select('*').order('name')
        setItems(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const openModal = (item?: any) => {
        setEditing(item ?? null)
        setName(item?.name ?? '')
        setError('')
        setModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            await upsertTaskTypeAction(name.trim(), editing?.id)
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
                    <h1 className="text-2xl font-serif text-maison-primary">Task Types</h1>
                    <p className="text-sm text-maison-secondary">Work categories assigned during QC (e.g. Stitching, Cutting, Embroidery)</p>
                </div>
                <Button onClick={() => openModal()}>
                    <Plus size={16} className="mr-2" /> Add Task Type
                </Button>
            </div>

            <Card padding="p-0">
                <Table headers={['Name', 'Created', 'Actions']}>
                    {items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-gray-500 text-sm">
                                {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : '—'}
                            </TableCell>
                            <TableCell>
                                <button
                                    onClick={() => openModal(item)}
                                    className="p-1.5 text-gray-400 hover:text-maison-primary hover:bg-gray-100 rounded transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length === 0 && !loading && (
                        <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No task types yet.</td>
                        </tr>
                    )}
                </Table>
            </Card>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Task Type' : 'Add Task Type'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Task Type Name"
                        value={name}
                        onChange={(e: any) => setName(e.target.value)}
                        placeholder="e.g. Stitching, Embroidery, Lining"
                        required
                    />
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
