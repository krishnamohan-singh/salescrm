import React, { useState } from 'react';
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
import { FileEdit } from 'lucide-react';

interface AttendanceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultDate?: string;
}

export function AttendanceRequestModal({
    isOpen,
    onClose,
    defaultDate,
}: AttendanceRequestModalProps) {
    const { t } = useTranslation();

    const [date, setDate] = useState<string>(defaultDate || new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<string>('punch_regularization');
    const [clockIn, setClockIn] = useState<string>('09:30');
    const [clockOut, setClockOut] = useState<string>('18:30');
    const [reason, setReason] = useState<string>('');
    const [processing, setProcessing] = useState<boolean>(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error(t('Please provide a reason for the attendance request.'));
            return;
        }

        setProcessing(true);

        router.post(
            route('attendance.requests.store'),
            {
                date,
                type,
                clock_in: clockIn,
                clock_out: clockOut,
                reason,
            },
            {
                onSuccess: () => {
                    toast.success(t('Attendance request submitted for approval.'));
                    setReason('');
                    onClose();
                },
                onError: () => {
                    toast.error(t('Failed to submit attendance request.'));
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <FileEdit className="w-5 h-5 text-indigo-600" />
                            {t('Request Attendance Regularization')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Submit a request to correct missing punches, half-day, or mark on-duty attendance.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="req_date">{t('Date')}</Label>
                                <Input
                                    id="req_date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="req_type">{t('Request Type')}</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger id="req_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="punch_regularization">{t('Missing Punch Correction')}</SelectItem>
                                        <SelectItem value="on_duty">{t('On-Duty / Client Visit')}</SelectItem>
                                        <SelectItem value="half_day">{t('Half Day Adjustment')}</SelectItem>
                                        <SelectItem value="overtime">{t('Overtime Claim')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="req_clock_in">{t('Actual Clock In')}</Label>
                                <Input
                                    id="req_clock_in"
                                    type="time"
                                    value={clockIn}
                                    onChange={(e) => setClockIn(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="req_clock_out">{t('Actual Clock Out')}</Label>
                                <Input
                                    id="req_clock_out"
                                    type="time"
                                    value={clockOut}
                                    onChange={(e) => setClockOut(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="req_reason">{t('Reason / Explanation')}</Label>
                            <Textarea
                                id="req_reason"
                                placeholder={t('Explain why punch was missed (e.g. biometric machine down, field visit at client site)...')}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {processing ? t('Submitting...') : t('Submit Request')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
