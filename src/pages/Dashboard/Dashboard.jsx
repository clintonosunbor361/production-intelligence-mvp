import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Shirt, Scissors, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeItems: 0,
        totalRevenue: 0,
        productionCount: 0,
        completedCount: 0,
        pendingVerification: 0
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        const [items, tasks] = await Promise.all([
            db.getItems(),
            db.getTasks()
        ]);

        // 1. Active Items (Not Received, Not Cancelled)
        const activeItems = items.filter(i => i.status !== 'Received' && i.status !== 'Cancelled').length;

        // 2. Verified Pay (Revenue/Cost context) - Sum of verified tailor pay
        const verifiedTasks = tasks.filter(t => t.verification_status === 'Verified');
        const totalRevenue = verifiedTasks.reduce((sum, t) => sum + t.tailor_pay, 0);

        // 3. Status Breakdown
        const productionCount = items.filter(i => i.status === 'New').length;
        const completedCount = items.filter(i => i.status === 'Received').length;

        // 4. Pending Tasks
        const pendingVerification = tasks.filter(t => t.verification_status === 'Pending').length;

        setStats({
            activeItems,
            totalRevenue,
            productionCount,
            completedCount,
            pendingVerification
        });
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Items */}
                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/production')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary">
                            <Shirt size={20} />
                        </div>
                        <span className="text-gray-300">•••</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Active Items</p>
                    <div className="flex items-end gap-3 mt-1">
                        <h3 className="text-3xl font-serif text-maison-primary">{stats.activeItems}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">In pipeline</p>
                </Card>

                {/* Pending Verification */}
                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounts')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary">
                            <ShoppingBag size={20} />
                        </div>
                        {stats.pendingVerification > 0 && <span className="absolute top-6 right-6 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
                    </div>
                    <p className="text-sm font-medium text-gray-500">Pending Pay</p>
                    <div className="flex items-end gap-3 mt-1">
                        <h3 className="text-3xl font-serif text-maison-primary">{stats.pendingVerification}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Tasks waiting approval</p>
                </Card>

                {/* Completed */}
                <Card className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/receiving')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <div className="flex items-end gap-3 mt-1">
                        <h3 className="text-3xl font-serif text-maison-primary">{stats.completedCount}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Items received</p>
                </Card>

                {/* Total Cost/Revenue involved */}
                <Card className="relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-50 rounded-md text-maison-secondary">
                            <span className="font-serif font-bold text-lg leading-none">$</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Tailor Pay</p>
                    <div className="flex items-end gap-3 mt-1">
                        <h3 className="text-3xl font-serif text-maison-primary">${stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Verified to date</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart (Visual Only for MVP) */}
                <Card className="lg:col-span-2 min-h-[300px]">
                    <h3 className="font-serif text-lg mb-1">Weekly Output</h3>
                    <p className="text-sm text-gray-400 mb-6">Items received over time</p>
                    <div className="h-40 flex items-center justify-center text-gray-300 italic border-2 border-dashed border-gray-100 rounded-lg">
                        (Chart placeholder)
                    </div>
                </Card>

                {/* Quick Actions / Status */}
                <Card>
                    <h3 className="font-serif text-lg mb-4">Pipeline Status</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm text-gray-600">New / Cutting</span>
                            <span className="font-medium">{stats.productionCount}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm text-gray-600">QC Check</span>
                            <span className="font-medium">{stats.activeItems - stats.productionCount}</span>
                        </div>
                    </div>
                    <Button className="w-full mt-6" onClick={() => navigate('/production/create')}>
                        Start New Production
                    </Button>
                </Card>
            </div>
        </div>
    );
}
