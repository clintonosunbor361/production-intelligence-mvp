import React from 'react'
import Link from 'next/link'

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0E0E] text-white p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Access Denied</h1>
                <p className="text-base text-neutral-400">
                    Your account is not configured with an active role or organization. Please contact your system administrator to get access.
                </p>
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Return to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
