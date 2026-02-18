import React from 'react';
import { Bell, Search, Mail } from 'lucide-react';

export function Header({ title }) {
    return (
        <header className="px-8 h-20 bg-maison-surface/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
            <div>
                <h2 className="text-xl font-serif font-medium text-maison-primary">{title}</h2>
            </div>

            <div className="flex items-center gap-6">
                {/* Search */}
                <div className="relative">
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
                <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
                    <button className="text-gray-400 hover:text-maison-primary relative">
                        <Mail size={20} strokeWidth={1.5} />
                    </button>
                    <button className="text-gray-400 hover:text-maison-primary relative">
                        <Bell size={20} strokeWidth={1.5} />
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                    </button>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-2">
                        <div className="h-9 w-9 rounded-full bg-maison-accent-dim flex items-center justify-center text-maison-accent font-serif italic text-lg border border-white shadow-sm">
                            E
                        </div>
                        <div className="text-sm hidden md:block">
                            <p className="font-medium text-maison-primary">Elara V.</p>
                            <p className="text-xs text-gray-500">Head Designer</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
