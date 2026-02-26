'use client'

import { SupabaseAuthProvider } from '../context/SupabaseAuthContext'

export function Providers({ children }) {
    return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
}
