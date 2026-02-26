'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table'
import { ArrowLeft, Plus, CheckCircle2, XCircle } from 'lucide-react'
import {
    createWorkAssignmentAction,
    qcPassAction,
    qcFailAction,
} from '@/app/actions/spine'

function assignmentStatusVariant(status: string) {
    switch (status) {
        case 'QC_PASSED': return 'success'
        case 'QC_FAILED': return 'danger'
        case 'PAID': return 'success'
        case 'REVERSED': return 'neutral'
        default: return 'warning'
    }
}

function assignmentStatusLabel(status: string) {
    switch (status) {
        case 'CREATED': return 'Pending QC'
        case 'QC_PASSED': return 'QC Passed'
        case 'QC_FAILED': return 'QC Failed'
        case 'PAID': return 'Paid'
        case 'REVERSED': return 'Reversed'
        default: return status
    }
}

export default function ManageItemTasks() {
    const params = useParams()
    const itemId = params.itemId as string
    const router = useRouter()
    const supabase = createClient()

    const [item, setItem] = useState<any>(null)
    const [assignments, setAssignments] = useState<any[]>([])
    const [taskTypes, setTaskTypes] = useState<any[]>([])
    const [tailors, setTailors] = useState<any[]>([])
    const [rateCards, setRateCards] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [actionError, setActionError] = useState('')

    const [newAssignment, setNewAssignment] = useState({
        taskTypeId: '',
        tailorId: '',
    })

    const loadData = useCallback(async () => {
        setLoading(true)

        const { data: itemData, error: itemErr } = await supabase
            .from('items')
            .select(`id, item_key, status, product_type_id, tickets(ticket_number), product_types(name)`)
            .eq('id', itemId)
            .single()

        if (itemErr || !itemData) {
            alert('Item not found')
            router.push('/qc')
            return
        }

        setItem(itemData)

        const [
            { data: assignmentData },
            { data: taskTypeData },
            { data: tailorData },
            { data: rateCardData },
        ] = await Promise.all([
            supabase
                .from('work_assignments')
                .select(`id, status, pay_amount, pay_band_snapshot, qc_notes, task_types(name), tailors(name, band)`)
                .eq('item_id', itemId),
            supabase.from('task_types').select('id, name').order('name'),
            supabase.from('tailors').select('id, name, band').eq('active', true).order('name'),
            supabase
                .from('rate_cards')
                .select('id, task_type_id, band_a_fee, band_b_fee')
                .eq('product_type_id', itemData.product_type_id),
        ])

        setAssignments(assignmentData ?? [])
        // Only show task types that have a rate card for this product type
        const availableTaskTypeIds = new Set((rateCardData ?? []).map((r: any) => r.task_type_id))
        setTaskTypes((taskTypeData ?? []).filter((t: any) => availableTaskTypeIds.has(t.id)))
        setTailors(tailorData ?? [])
        setRateCards(rateCardData ?? [])
        setLoading(false)
    }, [itemId])

    useEffect(() => { loadData() }, [loadData])

    // Rate preview for assignment form
    const selectedRate = rateCards.find(r => r.task_type_id === newAssignment.taskTypeId)
    const selectedTailor = tailors.find(t => t.id === newAssignment.tailorId)
    const previewPay = selectedRate && selectedTailor
        ? selectedTailor.band === 'B' ? selectedRate.band_b_fee : selectedRate.band_a_fee
        : null

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionError('')
        try {
            await createWorkAssignmentAction(itemId, newAssignment.taskTypeId, newAssignment.tailorId)
            setShowForm(false)
            setNewAssignment({ taskTypeId: '', tailorId: '' })
            await loadData()
        } catch (err: any) {
            setActionError(err.message)
        }
    }

    const handleQCPass = async (assignmentId: string) => {
        try {
            await qcPassAction(assignmentId)
            await loadData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleQCFail = async (assignmentId: string) => {
        const notes = window.prompt('Enter QC failure notes (required):')
        if (!notes?.trim()) return
        try {
            await qcFailAction(assignmentId, notes)
            await loadData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    if (loading || !item) return <div className="p-8 text-gray-500 text-sm">Loading…</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/qc')}>
                    <ArrowLeft size={16} className="mr-2" /> Back to Queue
                </Button>
            </div>

            {/* Item header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-serif text-maison-primary flex items-center gap-3">
                        {item.item_key}
                        <Badge variant="neutral">{(item.product_types as any)?.name}</Badge>
                    </h1>
                    <p className="text-sm text-maison-secondary mt-1">
                        Ticket: {(item.tickets as any)?.ticket_number ?? '—'}
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus size={16} className="mr-2" /> Assign Task
                </Button>
            </div>

            {/* Assignment form */}
            {showForm && (
                <Card className="border-maison-accent/20 bg-maison-accent/5">
                    <h3 className="font-medium text-maison-primary mb-4">Assign New Task</h3>

                    {taskTypes.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                            <strong>No tasks available.</strong> No rate cards are configured for{' '}
                            <strong>{(item.product_types as any)?.name}</strong>. Configure them in{' '}
                            <strong>Rates</strong> first.
                        </div>
                    ) : (
                        <form onSubmit={handleAssign} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-maison-secondary mb-1.5">Task Type</label>
                                    <select
                                        required
                                        value={newAssignment.taskTypeId}
                                        onChange={e => setNewAssignment(p => ({ ...p, taskTypeId: e.target.value }))}
                                        className="block w-full rounded-lg border border-gray-200 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                                    >
                                        <option value="">Select Task…</option>
                                        {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-maison-secondary mb-1.5">Tailor</label>
                                    <select
                                        required
                                        value={newAssignment.tailorId}
                                        onChange={e => setNewAssignment(p => ({ ...p, tailorId: e.target.value }))}
                                        className="block w-full rounded-lg border border-gray-200 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                                    >
                                        <option value="">Select Tailor…</option>
                                        {tailors.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} (Band {t.band})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {previewPay !== null && (
                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500">Pay Band:</span>
                                        <span className="font-medium">Band {selectedTailor?.band}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-maison-primary pt-2 border-t border-gray-100 mt-2">
                                        <span>Estimated Pay:</span>
                                        <span>₦{Number(previewPay).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {actionError && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{actionError}</p>
                            )}

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setActionError('') }}>Cancel</Button>
                                <Button type="submit">Assign Task</Button>
                            </div>
                        </form>
                    )}
                </Card>
            )}

            {/* Assignments table */}
            <Card padding="p-0">
                <Table headers={['Task Type', 'Tailor', 'Band', 'Pay', 'Status', 'Notes', 'QC Actions']}>
                    {assignments.map(a => (
                        <TableRow key={a.id}>
                            <TableCell className="font-medium">{(a.task_types as any)?.name}</TableCell>
                            <TableCell>{(a.tailors as any)?.name}</TableCell>
                            <TableCell>Band {a.pay_band_snapshot}</TableCell>
                            <TableCell>₦{Number(a.pay_amount).toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={assignmentStatusVariant(a.status) as any}>
                                    {assignmentStatusLabel(a.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs max-w-[160px] truncate">
                                {a.qc_notes ?? '—'}
                            </TableCell>
                            <TableCell>
                                {a.status === 'CREATED' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleQCPass(a.id)}
                                            title="Pass QC"
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                        >
                                            <CheckCircle2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleQCFail(a.id)}
                                            title="Fail QC"
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                )}
                                {a.status === 'QC_FAILED' && (
                                    <button
                                        onClick={() => handleQCPass(a.id)}
                                        title="Re-pass QC"
                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                    >
                                        <CheckCircle2 size={18} />
                                    </button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {assignments.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                                No tasks assigned yet.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    )
}
