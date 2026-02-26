'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { ArrowLeft } from 'lucide-react'
import { createProductionBatchAction } from '@/app/actions/spine'

export default function CreateItem() {
    const router = useRouter()
    const supabase = createClient()

    const [productTypes, setProductTypes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        ticketNumber: '',
        productTypeId: '',
        quantity: 1,
    })

    useEffect(() => {
        supabase
            .from('product_types')
            .select('id, name')
            .order('name')
            .then(({ data }) => {
                setProductTypes(data ?? [])
                setLoading(false)
            })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            await createProductionBatchAction(
                formData.ticketNumber,
                formData.productTypeId,
                formData.quantity
            )
            router.push('/production')
        } catch (err: any) {
            setError(err.message)
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-gray-500 text-sm">Loading…</div>

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => router.push('/production')}>
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Log New Production Items</h1>
                    <p className="text-sm text-maison-secondary">Enter ticket details to generate items for the atelier.</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-maison-secondary mb-1.5">
                                Ticket Number <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. ORD-2026"
                                value={formData.ticketNumber}
                                onChange={(e) => setFormData(p => ({ ...p, ticketNumber: e.target.value }))}
                                className="block w-full rounded-lg border border-gray-200 shadow-sm text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20"
                            />
                            <p className="mt-1 text-xs text-gray-400">An existing ticket with this number will be reused.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-maison-secondary mb-1.5">
                                Product Type <span className="text-red-400">*</span>
                            </label>
                            <select
                                required
                                value={formData.productTypeId}
                                onChange={(e) => setFormData(p => ({ ...p, productTypeId: e.target.value }))}
                                className="block w-full rounded-lg border border-gray-200 shadow-sm text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20 bg-white"
                            >
                                <option value="">Select Product…</option>
                                {productTypes.map(pt => (
                                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="max-w-xs">
                        <label className="block text-sm font-medium text-maison-secondary mb-1.5">
                            Quantity to Generate <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            required
                            value={formData.quantity}
                            onChange={(e) => setFormData(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                            className="block w-full rounded-lg border border-gray-200 shadow-sm text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-maison-primary/20"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Creates {formData.quantity} separately tracked item{formData.quantity !== 1 ? 's' : ''}.
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
                    )}

                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => router.push('/production')}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Generating…' : 'Generate Items'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
