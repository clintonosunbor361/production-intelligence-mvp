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

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', data.user.id)
        .maybeSingle()

    if (!profile?.organization_id) {
        redirect('/unauthorized')
    }

    const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', data.user.id)
        .eq('organization_id', profile.organization_id)

    if (rolesError || !userRoles || userRoles.length !== 1) {
        redirect('/unauthorized')
    }

    return <DashboardLayout>{children}</DashboardLayout>
}