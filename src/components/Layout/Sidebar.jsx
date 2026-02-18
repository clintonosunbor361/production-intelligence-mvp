import React from 'react';
import { LayoutDashboard, ShoppingBag, Box, Users, Scissors, PieChart, Shirt, CheckCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { RoleSwitcher } from './RoleSwitcher';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    // Admin / Master Data
    { name: 'Tailors', href: '/tailors', icon: Users },
    { name: 'Products', href: '/products', icon: Shirt },
    { name: 'Categories', href: '/categories', icon: Box },
    { name: 'Rates', href: '/rates', icon: PieChart },

    // Operational (Placeholders for now, will link correctly later)
    { name: 'Accounts', href: '/accounts', icon: ShoppingBag, count: 5 }, // Reusing Orders icon/spot for Accounts
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2 },
    { name: 'Receiving', href: '/receiving', icon: Box }, // Reusing Inventory icon for Receiving
    // { name: 'Fittings', href: '/fittings', icon: Scissors }, // using Scissors as placeholder
    { name: 'Production', href: '/production', icon: Shirt },
    { name: 'Analytics', href: '/analytics', icon: PieChart },
];

export function Sidebar() {
    return (
        <div className="flex bg-maison-surface w-64 flex-col border-r border-gray-100 h-screen sticky top-0">
            {/* Brand */}
            <div className="flex items-center gap-3 px-6 h-20">
                <div className="bg-maison-primary text-white p-2 rounded-md">
                    <Shirt size={20} strokeWidth={1.5} />
                </div>
                <div>
                    <h1 className="font-serif text-lg font-medium leading-none">Maison</h1>
                    <p className="text-xs text-maison-secondary tracking-widest uppercase mt-1">Couture ERP</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 mt-6">
                <div className="px-2 mb-2 text-xs font-medium text-maison-secondary uppercase tracking-wider">
                    Atelier
                </div>
                {navigation.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
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
    );
}
