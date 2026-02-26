'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'

export default function QCQueue() {
    const router = useRouter()
    const supabase = createClient()

    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'new' | 'needs_attention'>('all')

    const loadItems = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('items')
            .select(`
                id, item_key, status, created_at,
                tickets (ticket_number),
                product_types (name),
                work_assignments (id, status)
            `)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: false })

        setItems(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { loadItems() }, [loadItems])

    const filtered = items.filter(item => {
        const assignments = (item.work_assignments as any[]) ?? []
        if (filter === 'new') return item.status === 'IN_PROGRESS' && assignments.length === 0
        if (filter === 'needs_attention') {
            // Items with QC_FAILED assignments or no assignments at all
            return assignments.some((a: any) => a.status === 'QC_FAILED') ||
                (item.status === 'IN_PROGRESS' && assignments.length === 0)
        }
        return true
    })

    const needsAttentionCount = items.filter(item => {
        const a = (item.work_assignments as any[]) ?? []
        return a.some((x: any) => x.status === 'QC_FAILED') ||
            (item.status === 'IN_PROGRESS' && a.length === 0)
    }).length

    const getItemBadge = (item: any) => {
        const assignments = (item.work_assignments as any[]) ?? []
        if (assignments.some((a: any) => a.status === 'QC_FAILED')) return { label: 'QC Failed', variant: 'danger' }
        if (assignments.length === 0 && item.status === 'IN_PROGRESS') return { label: 'Unassigned', variant: 'warning' }
        if (assignments.every((a: any) => a.status === 'QC_PASSED')) return { label: 'QC Passed', variant: 'success' }
        return { label: 'In Review', variant: 'neutral' }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Quality Control</h1>
                    <p className="text-sm text-maison-secondary">Assign tasks and verify quality</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {([
                        { key: 'all', label: 'All Items' },
                        { key: 'new', label: 'Unassigned' },
                        { key: 'needs_attention', label: `Needs Attention${needsAttentionCount > 0 ? ` (${needsAttentionCount})` : ''}` },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === tab.key ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Item Key', 'Ticket', 'Product Type', 'Status', 'Date', 'Action']}>
                    {filtered.map((item) => {
                        const badge = getItemBadge(item)
                        return (
                            <TableRow
                                key={item.id}
                                onClick={() => router.push(`/qc/item/${item.id}`)}
                                className="cursor-pointer"
                            >
                                <TableCell className="font-medium font-mono text-xs">{item.item_key}</TableCell>
                                <TableCell className="font-medium">{(item.tickets as any)?.ticket_number ?? '—'}</TableCell>
                                <TableCell>{(item.product_types as any)?.name}</TableCell>
                                <TableCell>
                                    <Badge variant={badge.variant as any}>{badge.label}</Badge>
                                </TableCell>
                                <TableCell className="text-gray-500">
                                    {item.created_at ? format(new Date(item.created_at), 'MMM d') : '—'}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm">
                                        Open <ChevronRight size={16} className="ml-1" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                    {filtered.length === 0 && !loading && (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                                No items match the filter.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    )
}
