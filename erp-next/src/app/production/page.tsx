'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table'
import { Plus, Trash2, Search, FilterX, Clock, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, startOfDay, endOfDay } from 'date-fns'
import { cancelItemAction } from '@/app/actions/spine'

function statusVariant(status: string) {
    switch (status) {
        case 'IN_PROGRESS': return 'brand'
        case 'COMPLETED': return 'success'
        case 'CANCELLED': return 'danger'
        default: return 'neutral'
    }
}

function statusLabel(status: string) {
    switch (status) {
        case 'IN_PROGRESS': return 'In Progress'
        case 'COMPLETED': return 'Completed'
        case 'CANCELLED': return 'Cancelled'
        default: return status
    }
}

export default function ItemList() {
    const router = useRouter()
    const supabase = createClient()

    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        ticketNumber: '', productType: '', status: '', startDate: '', endDate: '',
    })
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

    const loadItems = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('items')
            .select(`
                id, item_key, status, created_at,
                tickets (id, ticket_number),
                product_types (name),
                work_assignments (status)
            `)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: false })

        if (!error) setItems(data ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { loadItems() }, [loadItems])

    const handleCancel = async (itemId: string) => {
        if (!window.confirm('Cancel this item? This cannot be undone.')) return
        try {
            await cancelItemAction(itemId)
            await loadItems()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const allProductTypes = [...new Set(items.map(i => (i.product_types as any)?.name).filter(Boolean))]
    const allStatuses = [...new Set(items.map(i => i.status).filter(Boolean))]

    const filtered = items.filter(item => {
        const ticket = item.tickets as any
        const pt = (item.product_types as any)?.name ?? ''
        if (filters.ticketNumber && !ticket?.ticket_number?.toLowerCase().includes(filters.ticketNumber.toLowerCase())) return false
        if (filters.productType && pt !== filters.productType) return false
        if (filters.status && item.status !== filters.status) return false
        if (filters.startDate && new Date(item.created_at) < startOfDay(new Date(filters.startDate))) return false
        if (filters.endDate && new Date(item.created_at) > endOfDay(new Date(filters.endDate))) return false
        return true
    })

    // Group by ticket
    const grouped = filtered.reduce<Record<string, any>>((acc, item) => {
        const ticket = item.tickets as any
        const key = ticket?.id ?? 'unknown'
        if (!acc[key]) acc[key] = { ticket_id: key, ticket_number: ticket?.ticket_number ?? '—', items: [] }
        acc[key].items.push(item)
        return acc
    }, {})

    const totalBacklog = items.filter(i => i.status === 'IN_PROGRESS').length
    const totalCompleted = items.filter(i => i.status === 'COMPLETED').length

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Production Items</h1>
                    <p className="text-sm text-maison-secondary">Track all physical items in the pipeline</p>
                </div>
                <Button onClick={() => router.push('/production/create')}>
                    <Plus size={16} className="mr-2" /> Create Items
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex items-center gap-4">
                    <div className="p-3 bg-brand-50 text-maison-primary rounded-lg border border-brand-100">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Backlog</p>
                        <h3 className="text-2xl font-serif text-maison-primary">{totalBacklog}</h3>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Completed</p>
                        <h3 className="text-2xl font-serif text-maison-primary">{totalCompleted}</h3>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="pb-4">
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Ticket No.</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text" placeholder="..."
                                value={filters.ticketNumber}
                                onChange={(e) => setFilters(p => ({ ...p, ticketNumber: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maison-primary/20"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-auto min-w-[140px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Product Type</label>
                        <select
                            value={filters.productType}
                            onChange={(e) => setFilters(p => ({ ...p, productType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                        >
                            <option value="">All Products</option>
                            {allProductTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                        </select>
                    </div>
                    <div className="w-full sm:w-auto min-w-[130px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                        >
                            <option value="">All Statuses</option>
                            {allStatuses.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                        </select>
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Date Range</label>
                        <div className="flex items-center gap-2">
                            <input type="date" value={filters.startDate}
                                onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value }))}
                                className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                            />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={filters.endDate}
                                onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value }))}
                                className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                            />
                        </div>
                    </div>
                    <Button variant="ghost"
                        onClick={() => setFilters({ ticketNumber: '', productType: '', status: '', startDate: '', endDate: '' })}
                        className="text-gray-500 hover:text-gray-700 bg-gray-50 px-3"
                    >
                        <FilterX size={16} />
                    </Button>
                </div>
            </Card>

            {/* Accordion list */}
            <div className="space-y-4">
                {Object.values(grouped).map((group: any) => {
                    const isExpanded = expandedGroups[group.ticket_id]
                    const completedCount = group.items.filter((i: any) => i.status === 'COMPLETED').length
                    return (
                        <Card key={group.ticket_id} padding="p-0" className="overflow-hidden border border-gray-200">
                            <div
                                onClick={() => setExpandedGroups(p => ({ ...p, [group.ticket_id]: !p[group.ticket_id] }))}
                                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50 border-b border-gray-200' : ''}`}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="text-maison-primary min-w-5">
                                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className="font-mono text-sm font-medium text-gray-700">{group.ticket_number}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-maison-secondary">{group.items.length} items</span>
                                            <Badge variant={completedCount === group.items.length ? 'success' : 'neutral'}>
                                                {completedCount} / {group.items.length} Completed
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="bg-white">
                                    <Table headers={['Item Key', 'Product', 'Status', 'Date', 'Actions']}>
                                        {group.items.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium font-mono text-xs">{item.item_key}</TableCell>
                                                <TableCell>{(item.product_types as any)?.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-500 text-sm">
                                                    {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {item.status === 'IN_PROGRESS' && (
                                                        <button
                                                            onClick={() => handleCancel(item.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Cancel Item"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </Table>
                                </div>
                            )}
                        </Card>
                    )
                })}
                {filtered.length === 0 && !loading && (
                    <Card>
                        <div className="py-12 text-center text-gray-500 text-sm">No items found matching the selected filters.</div>
                    </Card>
                )}
            </div>
        </div>
    )
}
