import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Table, TableRow, TableCell, Badge } from '../../components/UI/Table';
import { Check, XSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingVerification() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setLoading(true);
        const data = await db.getTasks({ verification_status: 'Pending' });
        setTasks(data);
        setLoading(false);
    };

    const handleVerify = async (taskId) => {
        if (!window.confirm("Confirm payment verification for this task?")) return;
        await db.verifyTask(taskId, 'Verified');
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
                    <p className="text-sm text-maison-secondary">Verify completion and authorize payments</p>
                </div>
            </div>

            <Card padding="p-0">
                <Table headers={['Date', 'Item Key', 'Task', 'Tailor', 'Payable', 'Action']}>
                    {tasks.map((task) => (
                        <TableRow key={task.id}>
                            <TableCell className="text-gray-500">
                                {format(new Date(task.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{task.item_key}</TableCell>
                            <TableCell>
                                <div className="font-medium">{task.task_type_name}</div>
                                <div className="text-xs text-gray-500">{task.category_name}</div>
                            </TableCell>
                            <TableCell>{task.tailor_name}</TableCell>
                            <TableCell className="font-medium">
                                ${parseFloat(task.tailor_pay).toFixed(2)}
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleVerify(task.id)}
                                    >
                                        <Check size={16} className="mr-1" /> Verify
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => handleReject(task.id)}
                                    >
                                        <XSquare size={16} className="mr-1" /> Reject
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {tasks.length === 0 && !loading && (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500 text-sm">
                                No pending tasks found. All caught up!
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    );
}
