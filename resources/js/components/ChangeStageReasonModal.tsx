import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { ArrowRight, ArrowRightLeft, Sparkles, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface StageItem {
    id: string | number;
    name: string;
    color?: string;
}

export interface ChangeStageReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { newStageId?: string; reason: string }) => void;
    title?: string;
    itemName: string;
    entityType?: 'lead' | 'opportunity' | string;
    currentStage?: StageItem | null;
    targetStage?: StageItem | null;
    stages?: StageItem[];
    isStatusToggle?: boolean;
    currentStatus?: 'active' | 'inactive' | string;
    isLoading?: boolean;
}

export const ChangeStageReasonModal: React.FC<ChangeStageReasonModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    itemName,
    entityType = 'lead',
    currentStage,
    targetStage,
    stages = [],
    isStatusToggle = false,
    currentStatus = 'active',
    isLoading = false
}) => {
    const { t } = useTranslation();
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Pre-select target stage or reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setReason('');
            setError('');
            if (targetStage) {
                setSelectedStageId(targetStage.id.toString());
            } else if (stages.length > 0 && currentStage) {
                // Find a different stage or leave empty
                const other = stages.find((s) => s.id.toString() !== currentStage.id.toString());
                setSelectedStageId(other ? other.id.toString() : stages[0]?.id.toString() || '');
            } else if (stages.length > 0) {
                setSelectedStageId(stages[0]?.id.toString() || '');
            } else {
                setSelectedStageId('');
            }
        }
    }, [isOpen, targetStage, currentStage, stages]);

    const activeTargetStage = targetStage || stages.find((s) => s.id.toString() === selectedStageId);

    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const stageQuickReasons = [
        t('Customer requested next steps'),
        t('Budget & requirements confirmed'),
        t('Follow-up scheduled'),
        t('Proposal / quote sent'),
        t('Deal closed successfully'),
        t('Not interested / disqualified'),
        t('Lost to competitor'),
    ];

    const statusQuickReasons = [
        t('Temporarily on hold'),
        t('Invalid contact information'),
        t('Duplicate record'),
        t('Client requested pause'),
        t('Re-activated for new campaign'),
        t('Archived lead / inactivity'),
    ];

    const quickReasons = isStatusToggle ? statusQuickReasons : stageQuickReasons;

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            setError(t('Please provide a reason for this change.'));
            return;
        }

        if (!isStatusToggle && !targetStage && !selectedStageId) {
            setError(t('Please select a target stage.'));
            return;
        }

        if (!isStatusToggle && currentStage && selectedStageId === currentStage.id.toString()) {
            setError(t('Please select a different stage.'));
            return;
        }

        setError('');
        onConfirm({
            newStageId: selectedStageId || (targetStage ? targetStage.id.toString() : undefined),
            reason: trimmedReason
        });
    };

    const handleChipClick = (suggestion: string) => {
        if (!reason.trim()) {
            setReason(suggestion);
        } else if (!reason.includes(suggestion)) {
            setReason(`${reason.trim()}, ${suggestion}`);
        }
        setError('');
    };

    const modalTitle = title || (isStatusToggle
        ? (nextStatus === 'active' ? t('Activate Record') : t('Deactivate Record'))
        : t('Change Stage'));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border border-border shadow-2xl rounded-2xl">
                {/* Header with gradient tint */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b border-border/60">
                    <DialogHeader className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shadow-xs">
                                <ArrowRightLeft className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    {modalTitle}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {t('Record')}: <span className="font-semibold text-foreground">{itemName}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-5">
                    {/* Visual Stage or Status Transition */}
                    {isStatusToggle ? (
                        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">{t('Current')}:</span>
                                <span
                                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                        currentStatus === 'active'
                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300'
                                    }`}
                                >
                                    {currentStatus === 'active' ? t('Active') : t('Inactive')}
                                </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">{t('New')}:</span>
                                <span
                                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                        nextStatus === 'active'
                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300'
                                    }`}
                                >
                                    {nextStatus === 'active' ? t('Active') : t('Inactive')}
                                </span>
                            </div>
                        </div>
                    ) : targetStage ? (
                        /* Kanban Drop: Fixed target stage */
                        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-muted-foreground font-medium flex-shrink-0">{t('From')}:</span>
                                {currentStage ? (
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset truncate"
                                        style={{
                                            backgroundColor: currentStage.color ? `${currentStage.color}18` : undefined,
                                            color: currentStage.color,
                                            borderColor: currentStage.color ? `${currentStage.color}40` : undefined
                                        }}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStage.color || '#94a3b8' }} />
                                        {currentStage.name}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-muted-foreground font-medium flex-shrink-0">{t('To')}:</span>
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset truncate"
                                    style={{
                                        backgroundColor: targetStage.color ? `${targetStage.color}22` : undefined,
                                        color: targetStage.color,
                                        borderColor: targetStage.color ? `${targetStage.color}50` : undefined
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: targetStage.color || '#94a3b8' }} />
                                    {targetStage.name}
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* List view: Select Target Stage */
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="stage-select" className="text-xs font-semibold text-foreground">
                                    {t('Target Stage')} <span className="text-rose-500">*</span>
                                </Label>
                                {currentStage && (
                                    <span className="text-[11px] text-muted-foreground">
                                        {t('Current')}: <span className="font-medium text-foreground">{currentStage.name}</span>
                                    </span>
                                )}
                            </div>
                            <Select value={selectedStageId} onValueChange={(val) => { setSelectedStageId(val); setError(''); }}>
                                <SelectTrigger id="stage-select" className="h-10 text-sm">
                                    <SelectValue placeholder={t('Select target stage...')} />
                                </SelectTrigger>
                                <SelectContent className="z-50 max-h-60">
                                    {stages.map((stage) => {
                                        const isCurrent = currentStage && currentStage.id.toString() === stage.id.toString();
                                        return (
                                            <SelectItem
                                                key={stage.id}
                                                value={stage.id.toString()}
                                                disabled={isCurrent}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: stage.color || '#94a3b8' }}
                                                    />
                                                    <span className={isCurrent ? 'text-muted-foreground' : 'text-foreground'}>
                                                        {stage.name} {isCurrent && `(${t('Current')})`}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Reason Textarea */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="change-reason" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <span>{t('Reason for Change')}</span>
                                <span className="text-rose-500">*</span>
                            </Label>
                            <span className="text-[11px] text-muted-foreground">
                                {reason.length}/500
                            </span>
                        </div>
                        <Textarea
                            id="change-reason"
                            rows={3}
                            maxLength={500}
                            placeholder={
                                isStatusToggle
                                    ? t('Enter the reason for activating/deactivating this record...')
                                    : t('Enter the reason for this stage change...')
                            }
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            className={`resize-none text-sm transition-colors ${
                                error ? 'border-rose-500 focus-visible:ring-rose-500/20' : ''
                            }`}
                            autoFocus
                        />

                        {error && (
                            <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in-50">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{error}</span>
                            </p>
                        )}
                    </div>

                    {/* Quick suggestion tags */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span>{t('Quick reasons')}:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {quickReasons.map((sug, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleChipClick(sug)}
                                    className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-primary/10 hover:text-primary text-secondary-foreground transition-all duration-150 border border-border/50 cursor-pointer text-left"
                                >
                                    + {sug}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <DialogFooter className="px-6 py-3.5 bg-muted/20 border-t border-border flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        disabled={isLoading}
                        className="h-9 px-4 cursor-pointer"
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="h-9 px-5 gap-1.5 cursor-pointer shadow-xs"
                    >
                        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>
                            {isStatusToggle
                                ? (nextStatus === 'active' ? t('Confirm Activate') : t('Confirm Deactivate'))
                                : t('Confirm Change')}
                        </span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
