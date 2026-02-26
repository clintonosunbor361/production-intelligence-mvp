'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shirt } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen bg-maison-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-maison-primary text-white p-3 rounded-xl mb-4">
                        <Shirt size={28} strokeWidth={1.5} />
                    </div>
                    <h1 className="font-serif text-2xl font-medium text-maison-primary">Maison Couture</h1>
                    <p className="text-xs text-maison-secondary tracking-widest uppercase mt-1">Production ERP</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h2 className="font-serif text-lg text-maison-primary mb-6">Sign in to your account</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@maison.com"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maison-primary/20 focus:border-maison-primary/40 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maison-primary/20 focus:border-maison-primary/40 transition"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-maison-primary hover:bg-maison-primary/90 disabled:opacity-60 text-white font-medium text-sm py-2.5 px-4 rounded-lg transition-colors mt-2"
                        >
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Contact your administrator for account access.
                </p>
            </div>
        </div>
    )
}
