'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table'
import { format } from 'date-fns'
import { createPaymentBatchAction, reversePaymentAction } from '@/app/actions/spine'
import { RotateCcw } from 'lucide-react'

type Filter = 'all' | 'pending' | 'paid' | 'failed' | 'reversed'

function statusVariant(status: string) {
    switch (status) {
        case 'QC_PASSED': return 'warning'
        case 'PAID': return 'success'
        case 'QC_FAILED': return 'danger'
        case 'REVERSED': return 'neutral'
        default: return 'neutral'
    }
}

function statusLabel(status: string) {
    switch (status) {
        case 'CREATED': return 'Pending QC'
        case 'QC_PASSED': return 'Approved – Awaiting Payment'
        case 'QC_FAILED': return 'QC Failed'
        case 'PAID': return 'Paid'
        case 'REVERSED': return 'Reversed'
        default: return status
    }
}

export default function AccountsPage() {
    const supabase = createClient()

    const [assignments, setAssignments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<Filter>('pending')
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [paying, setPaying] = useState(false)
    const [error, setError] = useState('')

    const loadAssignments = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('work_assignments')
            .select(`
                id, status, pay_amount, pay_band_snapshot, created_at,
                items (item_key, tickets(ticket_number)),
                task_types (name),
                tailors (name)
            `)
            .order('created_at', { ascending: false })

        setAssignments(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { loadAssignments() }, [loadAssignments])

    const filtered = assignments.filter(a => {
        if (filter === 'pending') return a.status === 'QC_PASSED'
        if (filter === 'paid') return a.status === 'PAID'
        if (filter === 'failed') return a.status === 'QC_FAILED'
        if (filter === 'reversed') return a.status === 'REVERSED'
        return true
    })

    const pendingCount = assignments.filter(a => a.status === 'QC_PASSED').length
    const pendingTotal = assignments
        .filter(a => a.status === 'QC_PASSED')
        .reduce((sum, a) => sum + Number(a.pay_amount), 0)

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleAll = () => {
        const payable = filtered.filter(a => a.status === 'QC_PASSED').map(a => a.id)
        if (payable.every(id => selected.has(id))) {
            setSelected(prev => { const n = new Set(prev); payable.forEach(id => n.delete(id)); return n })
        } else {
            setSelected(prev => { const n = new Set(prev); payable.forEach(id => n.add(id)); return n })
        }
    }

    const handleBatchPay = async () => {
        if (selected.size === 0) return
        const batchRef = `BATCH-${Date.now()}`
        const paidAt = new Date().toISOString()
        setError('')
        setPaying(true)
        try {
            await createPaymentBatchAction(Array.from(selected), batchRef, paidAt)
            setSelected(new Set())
            await loadAssignments()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setPaying(false)
        }
    }

    const handleReverse = async (assignmentId: string) => {
        const reason = window.prompt('Enter reversal reason:')
        if (!reason?.trim()) return
        try {
            await reversePaymentAction(assignmentId, reason)
            await loadAssignments()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const tabs: { key: Filter; label: string }[] = [
        { key: 'pending', label: `Pending (${pendingCount})` },
        { key: 'paid', label: 'Paid' },
        { key: 'failed', label: 'QC Failed' },
        { key: 'reversed', label: 'Reversed' },
        { key: 'all', label: 'All' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Accounts Payable</h1>
                    <p className="text-sm text-maison-secondary">Review QC-passed tasks and process payments</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setFilter(tab.key); setSelected(new Set()) }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === tab.key ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Payment action bar */}
            {filter === 'pending' && pendingCount > 0 && (
                <Card className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-700">
                            {selected.size > 0
                                ? `${selected.size} assignment${selected.size !== 1 ? 's' : ''} selected`
                                : `${pendingCount} assignment${pendingCount !== 1 ? 's' : ''} awaiting payment`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Total pending: ₦{pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={toggleAll}>
                            {filtered.filter(a => a.status === 'QC_PASSED').every(a => selected.has(a.id)) ? 'Deselect All' : 'Select All'}
                        </Button>
                        <Button
                            size="sm"
                            disabled={selected.size === 0 || paying}
                            onClick={handleBatchPay}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                        >
                            {paying ? 'Processing…' : `Pay Selected (${selected.size})`}
                        </Button>
                    </div>
                </Card>
            )}

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
            )}

            <Card padding="p-0">
                <Table headers={['Date', 'Item Key', 'Ticket', 'Task', 'Tailor', 'Band', 'Amount', 'Status', 'Actions']}>
                    {filtered.map(a => (
                        <TableRow key={a.id}>
                            <TableCell className="text-gray-500 text-xs">
                                {format(new Date(a.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{(a.items as any)?.item_key}</TableCell>
                            <TableCell className="text-sm">{(a.items as any)?.tickets?.ticket_number ?? '—'}</TableCell>
                            <TableCell className="font-medium">{(a.task_types as any)?.name}</TableCell>
                            <TableCell>{(a.tailors as any)?.name}</TableCell>
                            <TableCell>Band {a.pay_band_snapshot}</TableCell>
                            <TableCell className="font-medium">₦{Number(a.pay_amount).toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={statusVariant(a.status) as any}>
                                    {statusLabel(a.status)}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {a.status === 'QC_PASSED' && (
                                    <input
                                        type="checkbox"
                                        checked={selected.has(a.id)}
                                        onChange={() => toggleSelect(a.id)}
                                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                )}
                                {a.status === 'PAID' && (
                                    <button
                                        onClick={() => handleReverse(a.id)}
                                        title="Reverse payment"
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {filtered.length === 0 && !loading && (
                        <tr>
                            <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-sm">
                                No records found.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    )
}
