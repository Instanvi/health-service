'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DataTable } from '../PatientsTable';
import { MagnifyingGlassIcon, EyeIcon } from "@phosphor-icons/react";
import { toast } from 'sonner';
import { useFetchDHIS2Report, useFetchDHIS2ReportById } from '@/hooks/useDHIS2Report';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function DHIS2ReportContent() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

    const { data, isLoading } = useFetchDHIS2Report({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        period: 'weekly'
    });

    const tasks = data?.tasks || [];

    const filteredTasks = tasks.filter((t: any) =>
        t.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.dataset_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleViewDetail = (taskId: string) => {
        setSelectedTaskId(taskId);
        setIsDetailOpen(true);
    };

    const columns: ColumnDef<any>[] = [
        { accessorKey: "task_id", header: "Task ID" },
        { accessorKey: "service", header: "Service" },
        { accessorKey: "dataset_name", header: "Dataset" },
        { accessorKey: "period_value", header: "Period" },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.original.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    row.original.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                    }`}>
                    {row.original.status}
                </span>
            )
        },
        {
            accessorKey: "started_at",
            header: "Started At",
            cell: ({ row }) => row.original.started_at ? format(new Date(row.original.started_at), 'PPP p') : '-'
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(row.original.task_id)}
                    className="h-8 w-8 p-0"
                >
                    <EyeIcon size={18} />
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <Card className="shadow-sm border-none p-6 min-h-[60vh] bg-white rounded-sm">
                <h1 className="text-xl font-bold pb-6">DHIS2 Reports Status</h1>

                <div className="flex justify-between items-center mb-6">
                    <div className="relative">
                        <Input
                            placeholder="Search reports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 w-[400] border-gray-300 rounded-sm"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                <DataTable
                    data={filteredTasks}
                    columns={columns}
                    isLoading={isLoading}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                />
            </Card>

            <ReportDetailSheet
                taskId={selectedTaskId}
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
            />
        </div>
    );
}

function ReportDetailSheet({ taskId, open, onOpenChange }: { taskId: string | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { data, isLoading } = useFetchDHIS2ReportById({
        taskId: taskId || '',
        period: 'weekly'
    }, { enabled: !!taskId });

    const task = data?.tasks?.[0] || (data as any)?.task; // Handle both possible structures

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="min-w-[40vw] h-screen overflow-auto">
                <SheetHeader className="pb-6 border-b">
                    <SheetTitle>Report Task Details</SheetTitle>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : task ? (
                    <div className="py-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Task ID" value={task.task_id} />
                            <DetailItem label="Status" value={task.status} />
                            <DetailItem label="Service" value={task.service} />
                            <DetailItem label="Dataset" value={task.dataset_name} />
                            <DetailItem label="Period" value={task.period_value} />
                            <DetailItem label="Attempts" value={task.attempts?.toString()} />
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <DetailItem label="Started At" value={task.started_at ? format(new Date(task.started_at), 'PPP p') : '-'} />
                            <DetailItem label="Completed At" value={task.completed_at ? format(new Date(task.completed_at), 'PPP p') : '-'} />
                            {task.next_retry_at && (
                                <DetailItem label="Next Retry At" value={format(new Date(task.next_retry_at), 'PPP p')} />
                            )}
                        </div>

                        {task.current_status && (
                            <div className="pt-4 border-t">
                                <Label className="text-xs text-gray-500 uppercase font-bold">Current Log/Status</Label>
                                <div className="mt-2 p-4 bg-gray-50 rounded border text-sm font-mono whitespace-pre-wrap">
                                    {task.current_status}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-20 text-center text-gray-500">
                        No details found for this task.
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function DetailItem({ label, value }: { label: string, value?: string }) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase font-bold">{label}</Label>
            <p className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-1">{value || '-'}</p>
        </div>
    );
}
