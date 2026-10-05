import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    FileCheck,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    User,
    Calendar,
    Search,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/custom-toast';

export default function AttendanceRequests() {
    const { t } = useTranslation();
    const {
        requests = { data: [] },
        stats = {},
        canApprove = false,
        filters = {},
    } = usePage().props as any;

    const [status, setStatus] = useState<string>(filters?.status || 'all');
    const [actionId, setActionId] = useState<number | null>(null);

    const handleFilterChange = (newStatus: string) => {
        setStatus(newStatus);
        router.get(
            route('attendance.requests'),
            { status: newStatus },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleApprove = (id: number) => {
        setActionId(id);
        router.post(
            route('attendance.requests.approve', id),
            {},
            {
                onSuccess: () => toast.success(t('Attendance request approved successfully.')),
                onFinish: () => setActionId(null),
            }
        );
    };

    const handleReject = (id: number) => {
        const reason = prompt(t('Enter rejection reason (optional):')) || 'Rejected by manager';
        setActionId(id);
        router.post(
            route('attendance.requests.reject', id),
            { admin_notes: reason },
            {
                onSuccess: () => toast.success(t('Attendance request rejected.')),
                onFinish: () => setActionId(null),
            }
        );
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Attendance'), href: route('attendance.index') },
        { title: t('Attendance Requests') },
    ];

    const requestList = requests.data || [];

    return (
        <PageTemplate
            title={t('Attendance Regularization Requests')}
            description={t('Review and approve missing punch corrections, half-day, and on-duty requests.')}
            url={route('attendance.requests')}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-5">
                
                {/* Status Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">{t('Pending Requests')}</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.pending ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">{t('Approved Requests')}</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.approved ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
                                <XCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">{t('Rejected Requests')}</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.rejected ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Toolbar */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Filter Status')}:</span>
                        <div className="w-36">
                            <Select value={status} onValueChange={handleFilterChange}>
                                <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Status')}</SelectItem>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                    <SelectItem value="approved">{t('Approved')}</SelectItem>
                                    <SelectItem value="rejected">{t('Rejected')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Requests Table */}
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4">{t('Employee')}</th>
                                    <th className="py-3 px-3">{t('Date')}</th>
                                    <th className="py-3 px-3">{t('Request Type')}</th>
                                    <th className="py-3 px-3">{t('Requested Punch')}</th>
                                    <th className="py-3 px-3">{t('Reason')}</th>
                                    <th className="py-3 px-3">{t('Status')}</th>
                                    <th className="py-3 px-4 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {requestList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-slate-400">
                                            {t('No attendance regularization requests found.')}
                                        </td>
                                    </tr>
                                ) : (
                                    requestList.map((req: any) => (
                                        <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {req.user?.name}
                                                </div>
                                                <div className="text-[11px] text-slate-400">{req.user?.email}</div>
                                            </td>
                                            <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                                {req.date}
                                            </td>
                                            <td className="py-3 px-3">
                                                <Badge variant="outline" className="text-[11px] capitalize">
                                                    {req.type?.replace(/_/g, ' ')}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                {req.clock_in ? new Date(req.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                {' - '}
                                                {req.clock_out ? new Date(req.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </td>
                                            <td className="py-3 px-3 max-w-[200px] truncate text-slate-600 dark:text-slate-400" title={req.reason}>
                                                {req.reason}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                                    req.status === 'approved'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                        : req.status === 'rejected'
                                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                                }`}>
                                                    {req.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                    {req.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                                    {req.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                                    {req.status?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {canApprove && req.status === 'pending' ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => handleApprove(req.id)}
                                                            disabled={actionId === req.id}
                                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                        >
                                                            {t('Approve')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReject(req.id)}
                                                            disabled={actionId === req.id}
                                                            className="h-7 text-xs text-rose-600 hover:text-rose-700 border-rose-200"
                                                        >
                                                            {t('Reject')}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px]">
                                                        {req.reviewed_by ? `${t('Reviewed')}` : '-'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

            </div>
        </PageTemplate>
    );
}
