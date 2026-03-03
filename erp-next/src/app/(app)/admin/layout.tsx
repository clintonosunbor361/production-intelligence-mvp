import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import React from 'react'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
        redirect('/login')
    }

    return (
        <>{children}</>
    )
}
