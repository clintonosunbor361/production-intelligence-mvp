import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/Layout/DashboardLayout'

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const authResponse = await supabase.auth.getUser()
    const data = authResponse.data
    const error = authResponse.error

    // If session is missing/expired, force login
    if (error || !data?.user) {
        redirect('/login')
    }

    return <DashboardLayout>{children}</DashboardLayout>
}