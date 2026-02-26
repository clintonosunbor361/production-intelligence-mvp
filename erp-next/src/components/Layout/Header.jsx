'use client'

import React from 'react'
import { Bell, Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../context/SupabaseAuthContext'

export function Header({ title, onMenuClick }) {
    const { user, role, signOut } = useAuth()

    const initials = user?.email
        ? user.email[0].toUpperCase()
        : '?'

    const displayEmail = user?.email ?? ''
    const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'

    return (
        <header className="px-4 md:px-8 h-16 md:h-20 bg-maison-surface/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 md:border-none">
            <div className="flex items-center gap-4">
                <button
                    className="md:hidden text-maison-secondary hover:text-maison-primary p-1"
                    onClick={onMenuClick}
                >
                    <Menu size={24} />
                </button>
                <h2 className="text-lg md:text-xl font-serif font-medium text-maison-primary truncate">{title}</h2>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <div className="flex items-center gap-2 md:gap-4 md:border-l md:border-gray-200 md:pl-6">
                    <button className="text-gray-400 hover:text-maison-primary relative">
                        <Bell size={20} strokeWidth={1.5} />
                    </button>

                    {/* User info */}
                    <div className="flex items-center gap-3 pl-2">
                        <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-maison-accent-dim flex items-center justify-center text-maison-accent font-serif text-sm font-bold border border-white shadow-sm">
                            {initials}
                        </div>
                        <div className="text-sm hidden md:block">
                            <p className="font-medium text-maison-primary truncate max-w-[140px]">{displayEmail}</p>
                            <p className="text-xs text-gray-500">{displayRole}</p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={signOut}
                        title="Sign out"
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                        <LogOut size={18} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </header>
    )
}
