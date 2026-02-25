"use client";

import React from 'react';
import { Bell, Search, Mail, Menu } from 'lucide-react';

export function Header({ title, onMenuClick }) {
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
                {/* Search - Hidden on small mobile if needed, or collapsed */}
                <div className="relative hidden md:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search orders, clients..."
                        className="block w-64 pl-10 pr-3 py-2 border-none rounded-full bg-gray-50 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-maison-accent/50"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 md:gap-4 md:border-l md:border-gray-200 md:pl-6">
                    <button className="hidden md:block text-gray-400 hover:text-maison-primary relative">
                        <Mail size={20} strokeWidth={1.5} />
                    </button>
                    <button className="text-gray-400 hover:text-maison-primary relative">
                        <Bell size={20} strokeWidth={1.5} />
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                    </button>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-2">
                        <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-maison-accent-dim flex items-center justify-center text-maison-accent font-serif italic text-lg border border-white shadow-sm">
                            P
                        </div>
                        <div className="text-sm hidden md:block">
                            <p className="font-medium text-maison-primary">Pamela</p>
                            <p className="text-xs text-gray-500">Head of Production</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
