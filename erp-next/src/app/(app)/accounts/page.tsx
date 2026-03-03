// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/services/db';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '@/components/UI/Table';
import { Check, XSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingVerification() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setLoading(true);
        const data = await db.getTasks(); // Fetch all tasks
        setTasks(data);
        setLoading(false);
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        if (filter === 'pending') return task.verification_status === 'Pending';
        if (filter === 'approved') return task.verification_status === 'Approved' || task.verification_status === 'Verified';
        if (filter === 'rejected') return task.verification_status === 'Rejected';
        return true;
    });

    const handleApprove = async (taskId) => {
        if (!window.confirm("Confirm payment approval for this task?")) return;
        await db.verifyTask(taskId, 'Approved');
        loadTasks();
    };

    const handleReject = async (taskId) => {
        const reason = window.prompt("Enter rejection reason:");
        if (!reason) return; // Cancelled
        await db.verifyTask(taskId, 'Rejected', reason);
        loadTasks();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif text-maison-primary">Accounts Payable</h1>
                    <p className="text-sm text-maison-secondary">Approve completion and authorize payments</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'pending' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'approved' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'rejected' ? 'bg-white shadow text-maison-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Rejected
                    </button>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Date', 'Item Key', 'Customer', 'Task', 'Tailor', 'Payable', 'Status / Action']}>
                    {filteredTasks.map((task) => (
                        <TableRow key={task.id}>
                            <TableCell className="text-gray-500">
                                {format(new Date(task.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{task.item_key}</TableCell>
                            <TableCell>{task.customer_name}</TableCell>
                            <TableCell>
                                <div className="font-medium">{task.task_type_name}</div>
                                <div className="text-xs text-gray-500">{task.category_name}</div>
                            </TableCell>
                            <TableCell>{task.tailor_name}</TableCell>
                            <TableCell className="font-medium">
                                ₦{parseFloat(task.tailor_pay).toFixed(2)}
                            </TableCell>
                            <TableCell>
                                {task.verification_status === 'Pending' ? (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => handleApprove(task.id)}
                                        >
                                            <Check size={16} className="mr-1" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleReject(task.id)}
                                        >
                                            <XSquare size={16} className="mr-1" /> Reject
                                        </Button>
                                    </div>
                                ) : (
                                    <Badge variant={task.verification_status === 'Approved' || task.verification_status === 'Verified' ? 'success' : 'danger'}>
                                        {task.verification_status === 'Verified' ? 'Approved' : task.verification_status}
                                    </Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredTasks.length === 0 && !loading && (
                        <tr>
                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No tasks found matching the selected filter.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    );
}
