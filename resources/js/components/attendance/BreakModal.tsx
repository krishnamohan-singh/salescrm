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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Coffee, Play, Pause } from 'lucide-react';

interface BreakModalProps {
    isOpen: boolean;
    onClose: () => void;
    isOnBreak: boolean;
    currentBreakReason?: string;
    onSuccess?: () => void;
}

export function BreakModal({
    isOpen,
    onClose,
    isOnBreak,
    currentBreakReason,
    onSuccess,
}: BreakModalProps) {
    const { t } = useTranslation();
    const [reason, setReason] = useState<string>(currentBreakReason || 'Lunch Break');
    const [processing, setProcessing] = useState<boolean>(false);

    const handleToggle = () => {
        setProcessing(true);

        router.post(
            route('attendance.break.toggle'),
            { reason },
            {
                onSuccess: () => {
                    toast.success(
                        isOnBreak
                            ? t('Break ended. Resumed active work.')
                            : t('Break started (:reason).', { reason })
                    );
                    onSuccess?.();
                    onClose();
                },
                onError: () => {
                    toast.error(t('Failed to update break status.'));
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <Coffee className="w-5 h-5 text-amber-600" />
                        {isOnBreak ? t('End Current Break') : t('Take a Break')}
                    </DialogTitle>
                    <DialogDescription>
                        {isOnBreak
                            ? t('You are currently on break. Click below to resume active work.')
                            : t('Select your break reason. This will pause your active time counter.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    {!isOnBreak ? (
                        <div className="space-y-1.5">
                            <Label htmlFor="break_reason">{t('Break Reason')}</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger id="break_reason">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Lunch Break">{t('Lunch Break (45 mins)')}</SelectItem>
                                    <SelectItem value="Tea / Coffee Break">{t('Tea / Coffee Break (15 mins)')}</SelectItem>
                                    <SelectItem value="Personal Break">{t('Personal Break')}</SelectItem>
                                    <SelectItem value="External Meeting">{t('External / In-person Discussion')}</SelectItem>
                                    <SelectItem value="Training / Session">{t('Training / Learning')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                {t('Current Break')}: <span className="font-bold">{currentBreakReason || reason}</span>
                            </p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                {t('Active tracking is paused while on break.')}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleToggle}
                        disabled={processing}
                        className={
                            isOnBreak
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }
                    >
                        {isOnBreak ? (
                            <>
                                <Play className="w-3.5 h-3.5 mr-1.5" />
                                {processing ? t('Resuming...') : t('Resume Work')}
                            </>
                        ) : (
                            <>
                                <Pause className="w-3.5 h-3.5 mr-1.5" />
                                {processing ? t('Starting...') : t('Start Break')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
