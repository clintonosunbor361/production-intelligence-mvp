import React from 'react';
import { LayoutDashboard, ShoppingBag, Box, Users, Scissors, PieChart, Shirt, CheckCircle2, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { RoleSwitcher } from './RoleSwitcher';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },

    // Operational
    { name: 'Production', href: '/production', icon: Shirt },
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2 },
    { name: 'Completion', href: '/receiving', icon: Box }, // Reusing Inventory icon for Receiving
    { name: 'Accounts', href: '/accounts', icon: ShoppingBag, count: 5 }, // Reusing Orders icon/spot for Accounts
    { name: 'Analytics', href: '/analytics', icon: PieChart },

    // Admin / Master Data
    { name: 'Tailors', href: '/tailors', icon: Users },
    { name: 'Products', href: '/products', icon: Shirt },
    { name: 'Categories', href: '/categories', icon: Box },
    { name: 'Rates', href: '/rates', icon: PieChart },
];

export function Sidebar({ isOpen, onClose }) {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div
                className={clsx(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-maison-surface border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Brand */}
                <div className="flex items-center justify-between px-6 h-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-maison-primary text-white p-2 rounded-md">
                            <Shirt size={20} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="font-serif text-lg font-medium leading-none">Maison</h1>
                            <p className="text-xs text-maison-secondary tracking-widest uppercase mt-1">Couture ERP</p>
                        </div>
                    </div>
                    {/* Close Button (Mobile Only) */}
                    <button
                        onClick={onClose}
                        className="md:hidden text-maison-secondary hover:text-maison-primary"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1 mt-6 overflow-y-auto">
                    <div className="px-2 mb-2 text-xs font-medium text-maison-secondary uppercase tracking-wider">
                        Atelier
                    </div>
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => onClose && window.innerWidth < 768 && onClose()} // Close on navigation on mobile
                            className={({ isActive }) =>
                                clsx(
                                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                                    isActive
                                        ? 'bg-maison-bg text-maison-primary'
                                        : 'text-maison-secondary hover:bg-gray-50 hover:text-maison-primary'
                                )
                            }
                        >
                            <item.icon
                                className={clsx(
                                    'mr-3 h-5 w-5 lex-shrink-0 transition-colors',
                                )}
                                aria-hidden="true"
                                strokeWidth={1.5}
                            />
                            {item.name}
                            {item.count && (
                                <span className="ml-auto bg-maison-accent-dim/30 text-maison-accent py-0.5 px-2 rounded-full text-xs font-semibold">
                                    {item.count}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    <RoleSwitcher />
                    <div className="flex items-center text-xs font-medium text-maison-secondary px-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                        System Operational
                    </div>
                </div>
            </div>
        </>
    );
}
