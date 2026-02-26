'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Table'
import { Shirt, ShoppingBag, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'

export default function Dashboard() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        activeItems: 0,
        completedItems: 0,
        pendingPayment: 0,
        totalPaid: 0,
    })
    const [topProducts, setTopProducts] = useState<any[]>([])
    const [payrollSummary, setPayrollSummary] = useState<any[]>([])

    const [dateRange, setDateRange] = useState({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0],
        end: endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0],
    })

    useEffect(() => { loadStats() }, [dateRange])

    const loadStats = async () => {
        setLoading(true)

        const startDate = new Date(dateRange.start + 'T00:00:00')
        const endDate = new Date(dateRange.end + 'T23:59:59')

        const [
            { data: items },
            { data: assignments },
            { data: payments },
        ] = await Promise.all([
            supabase
                .from('items')
                .select('id, status, created_at, product_types(name)')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString()),
            supabase
                .from('work_assignments')
                .select('id, status, pay_amount, tailor_id, tailors(name, band)'),
            supabase
                .from('payments')
                .select('amount, type')
                .eq('type', 'PAY'),
        ])

        const activeItems = (items ?? []).filter(i => i.status === 'IN_PROGRESS').length
        const completedItems = (items ?? []).filter(i => i.status === 'COMPLETED').length
        const pendingPayment = (assignments ?? []).filter(a => a.status === 'QC_PASSED').length
        const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

        // Top product types
        const productMap: Record<string, { produced: number; backlog: number }> = {}
        for (const item of items ?? []) {
            const name = (item.product_types as any)?.name ?? 'Unknown'
            if (!productMap[name]) productMap[name] = { produced: 0, backlog: 0 }
            if (item.status === 'COMPLETED') productMap[name].produced++
            else if (item.status === 'IN_PROGRESS') productMap[name].backlog++
        }
        const top = Object.entries(productMap)
            .map(([name, c]) => ({ name, ...c, total: c.produced + c.backlog }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)

        // Payroll: group work_assignments by tailor, sum QC_PASSED + PAID amounts
        const payrollMap: Record<string, { name: string; count: number; total: number }> = {}
        for (const a of assignments ?? []) {
            if (!['QC_PASSED', 'PAID'].includes(a.status)) continue
            const tailor = a.tailors as any
            const tName = tailor?.name ?? 'Unknown'
            if (!payrollMap[a.tailor_id]) {
                payrollMap[a.tailor_id] = { name: tName, count: 0, total: 0 }
            }
            payrollMap[a.tailor_id].count++
            payrollMap[a.tailor_id].total += Number(a.pay_amount)
        }
        const payroll = Object.values(payrollMap).sort((a, b) => b.total - a.total)

        setStats({ activeItems, completedItems, pendingPayment, totalPaid })
        setTopProducts(top)
        setPayrollSummary(payroll)
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            {/* Header + Date filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Production Analytics</h1>
                    <p className="text-sm text-gray-500">Monitor performance and pipeline metrics.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-maison-primary/20"
                        />
                    </div>
                    <span className="text-gray-400 mt-5">-</span>
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-maison-primary/20"
                        />
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/production')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary"><Shirt size={20} /></div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Active Items</p>
                    <h3 className="text-3xl font-serif text-maison-primary mt-1">{loading ? '—' : stats.activeItems}</h3>
                    <p className="text-xs text-gray-400 mt-2">In pipeline</p>
                </Card>

                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/accounts')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary"><ShoppingBag size={20} /></div>
                        {stats.pendingPayment > 0 && (
                            <span className="absolute top-6 right-6 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-gray-500">Pending Payment</p>
                    <h3 className="text-3xl font-serif text-maison-primary mt-1">{loading ? '—' : stats.pendingPayment}</h3>
                    <p className="text-xs text-gray-400 mt-2">QC-passed, awaiting payout</p>
                </Card>

                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/completion')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary"><CheckCircle2 size={20} /></div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <h3 className="text-3xl font-serif text-maison-primary mt-1">{loading ? '—' : stats.completedItems}</h3>
                    <p className="text-xs text-gray-400 mt-2">Items received</p>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary">
                            <span className="font-serif font-bold text-lg leading-none">₦</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Total Paid Out</p>
                    <h3 className="text-3xl font-serif text-maison-primary mt-1">
                        {loading ? '—' : `₦${stats.totalPaid.toLocaleString()}`}
                    </h3>
                    <p className="text-xs text-gray-400 mt-2">Processed payments</p>
                </Card>
            </div>

            {/* Product breakdown + pipeline status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-serif text-lg">Top Product Types</h3>
                        <Badge variant="neutral">Produced vs Backlog</Badge>
                    </div>
                    <div className="space-y-4">
                        {topProducts.map((prod, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-1/3 truncate text-sm font-medium text-gray-700">{prod.name}</div>
                                <div className="flex-1 flex h-6 rounded-md overflow-hidden bg-gray-100">
                                    {prod.produced > 0 && (
                                        <div
                                            style={{ width: `${(prod.produced / prod.total) * 100}%` }}
                                            className="bg-emerald-500 h-full flex items-center justify-center text-[10px] text-white font-bold px-1 overflow-hidden"
                                        >{prod.produced}</div>
                                    )}
                                    {prod.backlog > 0 && (
                                        <div
                                            style={{ width: `${(prod.backlog / prod.total) * 100}%` }}
                                            className="bg-gray-300 h-full flex items-center justify-center text-[10px] text-gray-700 font-bold px-1 overflow-hidden"
                                        >{prod.backlog}</div>
                                    )}
                                </div>
                                <div className="w-16 text-right text-xs font-mono text-gray-500">Total: {prod.total}</div>
                            </div>
                        ))}
                        {topProducts.length === 0 && !loading && (
                            <div className="text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-lg">
                                No product records in this date range.
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4 mt-6 text-xs text-gray-500 justify-end">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>Completed</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-300"></div>In Progress</div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-serif text-lg mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Button className="w-full" onClick={() => router.push('/production/create')}>
                            + New Production Items
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={() => router.push('/qc')}>
                            Open QC Queue
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={() => router.push('/accounts')}>
                            Process Payments
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Payroll Summary */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-serif text-lg">Payroll Summary</h3>
                    <Badge variant="neutral">QC-Passed + Paid Assignments</Badge>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">Tailor</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-center">Assignments</th>
                                <th className="px-4 py-3 font-bold text-maison-primary text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payrollSummary.map((p, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                    <td className="px-4 py-3 text-center">{p.count}</td>
                                    <td className="px-4 py-3 text-right font-bold text-maison-primary">
                                        ₦{p.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            {payrollSummary.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No payroll data.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
