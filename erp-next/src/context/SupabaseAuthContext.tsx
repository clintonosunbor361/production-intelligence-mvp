'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type AuthContextType = {
    user: any
    role: string | null
    permissions: string[]
    orgId: string | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    permissions: [],
    orgId: null,
    loading: true,
    signOut: async () => {},
})

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null)
    const [role, setRole] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<string[]>([])
    const [orgId, setOrgId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    async function fetchUserRole(userId: string) {
        // Step 1: get user's role_id + org — simple flat query, only needs user_id = auth.uid() RLS
        const { data: urData, error: urError } = await supabase
            .from('user_roles')
            .select('organization_id, role_id')
            .eq('user_id', userId)
            .single()

        if (urError || !urData) {
            console.error('[Auth] user_roles fetch error:', urError)
            return { role: null, permissions: [], orgId: null }
        }

        const org: string = urData.organization_id
        const roleId: string = urData.role_id

        // Step 2: get role name by id — flat query on roles table
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('name')
            .eq('id', roleId)
            .single()

        if (roleError) {
            console.error('[Auth] roles fetch error:', roleError)
        }

        const roleName: string | null = roleData?.name?.toLowerCase() ?? null

        // Step 3: get permissions — flat query on role_permissions
        const { data: rpData, error: rpError } = await supabase
            .from('role_permissions')
            .select('permissions(name)')
            .eq('role_id', roleId)

        if (rpError) {
            console.error('[Auth] role_permissions fetch error:', rpError)
        }

        const perms: string[] = (rpData ?? [])
            .map((rp: any) => rp.permissions?.name)
            .filter(Boolean)

        console.log('[Auth] resolved role:', roleName, '| org:', org, '| perms:', perms)
        return { role: roleName, permissions: perms, orgId: org }
    }

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUser(session.user)
                const result = await fetchUserRole(session.user.id)
                setRole(result.role)
                setPermissions(result.permissions)
                setOrgId(result.orgId)
            }
            setLoading(false)
        }

        init()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUser(session.user)
                const result = await fetchUserRole(session.user.id)
                setRole(result.role)
                setPermissions(result.permissions)
                setOrgId(result.orgId)
            } else {
                setUser(null)
                setRole(null)
                setPermissions([])
                setOrgId(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, role, permissions, orgId, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within SupabaseAuthProvider')
    return context
}
