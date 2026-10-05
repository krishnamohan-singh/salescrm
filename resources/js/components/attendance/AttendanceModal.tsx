import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Clock, Calendar, UserCheck, AlertCircle } from 'lucide-react';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    record?: any;
    date: string;
    users?: { id: number; name: string; email: string }[];
}

export function AttendanceModal({
    isOpen,
    onClose,
    record,
    date,
    users = [],
}: AttendanceModalProps) {
    const { t } = useTranslation();
    const isEdit = !!record?.attendance_id;

    const [userId, setUserId] = useState<string>(record?.user_id ? String(record.user_id) : '');
    const [attDate, setAttDate] = useState<string>(record?.date || date);
    const [clockIn, setClockIn] = useState<string>(record?.clock_in || '09:30');
    const [clockOut, setClockOut] = useState<string>(record?.clock_out || '18:30');
    const [status, setStatus] = useState<string>(record?.status || 'present');
    const [clockInNote, setClockInNote] = useState<string>(record?.clock_in_note || '');
    const [clockOutNote, setClockOutNote] = useState<string>(record?.clock_out_note || '');
    const [processing, setProcessing] = useState<boolean>(false);

    useEffect(() => {
        if (record) {
            setUserId(record.user_id ? String(record.user_id) : '');
            setAttDate(record.date || date);
            setClockIn(record.clock_in || '09:30');
            setClockOut(record.clock_out || '18:30');
            setStatus(record.status || 'present');
            setClockInNote(record.clock_in_note || '');
            setClockOutNote(record.clock_out_note || '');
        } else {
            setUserId(users[0]?.id ? String(users[0].id) : '');
            setAttDate(date);
            setClockIn('09:30');
            setClockOut('18:30');
            setStatus('present');
            setClockInNote('');
            setClockOutNote('');
        }
    }, [record, date, users, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            user_id: userId,
            date: attDate,
            clock_in: clockIn,
            clock_out: clockOut,
            status: status,
            clock_in_note: clockInNote,
            clock_out_note: clockOutNote,
        };

        if (isEdit && record.attendance_id) {
            router.put(route('attendance.update', record.attendance_id), payload, {
                onSuccess: () => {
                    toast.success(t('Attendance record updated successfully.'));
                    onClose();
                },
                onError: (errs) => {
                    toast.error(t('Failed to update attendance record.'));
                },
                onFinish: () => setProcessing(false),
            });
        } else {
            router.post(route('attendance.store'), payload, {
                onSuccess: () => {
                    toast.success(t('Attendance record saved successfully.'));
                    onClose();
                },
                onError: (errs) => {
                    toast.error(t('Failed to save attendance record.'));
                },
                onFinish: () => setProcessing(false),
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Clock className="w-5 h-5 text-blue-600" />
                            {isEdit ? t('Edit Attendance Record') : t('Add Attendance Record')}
                        </DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? t('Update punch timestamps and status for this employee.')
                                : t('Manually log an attendance entry for an employee.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Employee Select */}
                        {!isEdit && (
                            <div className="space-y-1.5">
                                <Label htmlFor="user_id">{t('Employee')}</Label>
                                <Select value={userId} onValueChange={setUserId} required>
                                    <SelectTrigger id="user_id">
                                        <SelectValue placeholder={t('Select Employee')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((u) => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {u.name} ({u.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {isEdit && record?.name && (
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{record.name}</span>
                                <span className="text-slate-500">{record.role}</span>
                            </div>
                        )}

                        {/* Date & Status */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="date">{t('Date')}</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={attDate}
                                    onChange={(e) => setAttDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="status">{t('Status')}</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger id="status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="present">{t('Present')}</SelectItem>
                                        <SelectItem value="late">{t('Late')}</SelectItem>
                                        <SelectItem value="half_day">{t('Half Day')}</SelectItem>
                                        <SelectItem value="on_leave">{t('On Leave')}</SelectItem>
                                        <SelectItem value="absent">{t('Absent')}</SelectItem>
                                        <SelectItem value="holiday">{t('Holiday')}</SelectItem>
                                        <SelectItem value="week_off">{t('Week Off')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Punch In & Out */}
                        {status !== 'absent' && status !== 'on_leave' && status !== 'holiday' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="clock_in">{t('Clock In Time')}</Label>
                                    <Input
                                        id="clock_in"
                                        type="time"
                                        value={clockIn}
                                        onChange={(e) => setClockIn(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="clock_out">{t('Clock Out Time')}</Label>
                                    <Input
                                        id="clock_out"
                                        type="time"
                                        value={clockOut}
                                        onChange={(e) => setClockOut(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label htmlFor="clock_in_note">{t('Notes / Remarks')}</Label>
                            <Textarea
                                id="clock_in_note"
                                placeholder={t('e.g. Approved manual punch / WFH / client visit')}
                                value={clockInNote}
                                onChange={(e) => setClockInNote(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {processing ? t('Saving...') : t('Save Record')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
