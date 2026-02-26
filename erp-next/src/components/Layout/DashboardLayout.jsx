"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// Page title map keyed by pathname prefix
const PAGE_TITLES = {
    '/': 'Dashboard',
    '/production': 'Production',
    '/qc': 'Quality Control',
    '/accounts': 'Accounts Payable',
    '/completion': 'Completion & Receiving',
    '/tailors': 'Tailors',
    '/products': 'Product Types',
    '/categories': 'Task Types',
    '/rates': 'Rate Cards',
};

function getTitle(pathname) {
    // Exact match first, then prefix
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    const prefix = Object.keys(PAGE_TITLES)
        .filter(k => k !== '/')
        .find(k => pathname.startsWith(k));
    return prefix ? PAGE_TITLES[prefix] : 'Maison Couture';
}

export function DashboardLayout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Login page renders its own full-page layout
    if (pathname === '/login') {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-maison-bg font-sans text-maison-primary">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header
                    title={getTitle(pathname)}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
