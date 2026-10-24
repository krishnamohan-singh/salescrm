import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, PhoneCall, Calendar, Clock, User, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface LogCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentModule: 'lead' | 'account' | 'contact' | 'opportunity';
    parentId: number;
    parentName: string;
    parentPhone?: string;
    parentEmail?: string;
    users?: Array<{ id: number; name: string; email?: string }>;
    defaultAssigneeId?: number | string;
    contactId?: number;
}

export function LogCallModal({
    isOpen,
    onClose,
    parentModule,
    parentId,
    parentName,
    parentPhone,
    parentEmail,
    users = [],
    defaultAssigneeId,
    contactId,
}: LogCallModalProps) {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;
    const currentUserId = auth?.user?.id;

    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const getCurrentTime = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<'held' | 'planned' | 'not_held'>('held');
    const [startDate, setStartDate] = useState(getTodayDate());
    const [startTime, setStartTime] = useState(getCurrentTime());
    const [durationMinutes, setDurationMinutes] = useState('15');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            const defaultTitle = t('Call with {{name}}', { name: parentName });
            setTitle(defaultTitle);
            setStatus('held');
            setStartDate(getTodayDate());
            setStartTime(getCurrentTime());
            setDurationMinutes('15');
            setDescription('');
            setErrors({});

            const initialAssignee = defaultAssigneeId
                ? String(defaultAssigneeId)
                : currentUserId
                ? String(currentUserId)
                : users[0]?.id
                ? String(users[0].id)
                : '';
            setAssignedTo(initialAssignee);
        }
    }, [isOpen, parentName, defaultAssigneeId, currentUserId]);

    const calculateEndTime = (dateStr: string, timeStr: string, minutes: number) => {
        try {
            const [h, m] = timeStr.split(':').map(Number);
            const dt = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
            dt.setMinutes(dt.getMinutes() + minutes);
            const endH = String(dt.getHours()).padStart(2, '0');
            const endM = String(dt.getMinutes()).padStart(2, '0');
            const endD = dt.toISOString().split('T')[0];
            return { endDate: endD, endTime: `${endH}:${endM}` };
        } catch {
            return { endDate: dateStr, endTime: '23:59' };
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = t('Call title is required');
        }
        if (!startDate) {
            newErrors.startDate = t('Call date is required');
        }
        if (!startTime) {
            newErrors.startTime = t('Start time is required');
        }
        if (!assignedTo) {
            newErrors.assignedTo = t('Please assign a sales representative');
        }
        if (!description.trim()) {
            newErrors.description = t('Please enter the call discussion / notes');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const { endDate, endTime } = calculateEndTime(startDate, startTime, Number(durationMinutes) || 15);

        // Prepare Attendees
        const attendeesPayload: Array<{ type: string; id: number }> = [];

        if (parentModule === 'lead') {
            attendeesPayload.push({ type: 'lead', id: Number(parentId) });
        } else if (parentModule === 'contact') {
            attendeesPayload.push({ type: 'contact', id: Number(parentId) });
        } else if (contactId) {
            attendeesPayload.push({ type: 'contact', id: Number(contactId) });
        }

        // Always include assigned user as an attendee
        if (assignedTo) {
            attendeesPayload.push({ type: 'user', id: Number(assignedTo) });
        }

        const payload = {
            title: title.trim(),
            description: description.trim(),
            start_date: startDate,
            end_date: endDate,
            start_time: startTime,
            end_time: endTime,
            parent_module: parentModule,
            parent_id: Number(parentId),
            status: status,
            assigned_to: Number(assignedTo),
            attendees: attendeesPayload,
        };

        setIsSubmitting(true);
        router.post(route('calls.store'), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                toast.success(t('Call and discussion recorded successfully!'));
                onClose();
            },
            onError: (errs) => {
                setIsSubmitting(false);
                setErrors(errs);
                const firstErr = Object.values(errs)[0];
                if (firstErr) {
                    toast.error(String(firstErr));
                }
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <PhoneCall className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                {t('Log Call & Discussion')}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {t('Record call notes, client response, and discussion summary for')} <span className="font-semibold text-foreground">{parentName}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Contact Number Preview Banner (if available) */}
                    {parentPhone && (
                        <div className="p-3 rounded-lg bg-muted/40 border flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{t('Phone')}: <span className="font-semibold text-foreground">{parentPhone}</span></span>
                            </div>
                            <a
                                href={`tel:${parentPhone}`}
                                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                                <PhoneCall className="h-3 w-3" />
                                {t('Dial')}
                            </a>
                        </div>
                    )}

                    {/* Call Title / Subject */}
                    <div className="space-y-1.5">
                        <Label htmlFor="call-title" required className="text-xs font-semibold">
                            {t('Call Subject / Purpose')}
                        </Label>
                        <Input
                            id="call-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('e.g., Discovery Call, Product Discussion, Price Negotiation')}
                            className={errors.title ? 'border-red-500' : ''}
                        />
                        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                    </div>

                    {/* Call Status & Assigned Rep */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t('Call Status')}</Label>
                            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="held">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span>{t('Held / Completed (Had Call)')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="planned">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            <span>{t('Planned / Scheduled')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="not_held">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-rose-500" />
                                            <span>{t('Not Held / Missed')}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold" required>{t('Sales Representative')}</Label>
                            <Select value={assignedTo} onValueChange={setAssignedTo}>
                                <SelectTrigger className={errors.assignedTo ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select user')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.assignedTo && <p className="text-xs text-red-500">{errors.assignedTo}</p>}
                        </div>
                    </div>

                    {/* Call Date, Start Time & Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="call-start-date" required className="text-xs font-semibold">
                                {t('Call Date')}
                            </Label>
                            <Input
                                id="call-start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={errors.startDate ? 'border-red-500' : ''}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="call-start-time" required className="text-xs font-semibold">
                                {t('Time')}
                            </Label>
                            <Input
                                id="call-start-time"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className={errors.startTime ? 'border-red-500' : ''}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t('Duration')}</Label>
                            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">{t('5 Minutes')}</SelectItem>
                                    <SelectItem value="10">{t('10 Minutes')}</SelectItem>
                                    <SelectItem value="15">{t('15 Minutes')}</SelectItem>
                                    <SelectItem value="30">{t('30 Minutes')}</SelectItem>
                                    <SelectItem value="45">{t('45 Minutes')}</SelectItem>
                                    <SelectItem value="60">{t('1 Hour')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Discussion & Call Notes (The core requirement!) */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="call-discussion" required className="text-xs font-semibold flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                {t('Discussion & Call Notes')}
                            </Label>
                            <span className="text-[11px] text-muted-foreground italic">
                                {t('What was discussed and agreed?')}
                            </span>
                        </div>
                        <Textarea
                            id="call-discussion"
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('Mention what you discussed with the client, customer interest, key objections, requirements, or agreed next steps...')}
                            className={errors.description ? 'border-red-500 text-sm' : 'text-sm'}
                        />
                        {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                    </div>

                    <DialogFooter className="pt-3 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{isSubmitting ? t('Saving...') : t('Save Call & Discussion')}</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
