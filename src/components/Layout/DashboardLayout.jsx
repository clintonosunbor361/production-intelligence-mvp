import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';

export function DashboardLayout() {
    return (
        <div className="flex min-h-screen bg-maison-bg font-sans text-maison-primary">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header title="Atelier Overview" /> {/* Title should be dynamic based on route */}
                <div className="flex-1 overflow-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
