import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { SettingsSection } from '@/components/settings-section';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Save, Send, Clock, Calendar, Mail, ShieldAlert, CheckCircle2, Globe } from 'lucide-react';
import { toast } from '@/components/custom-toast';

interface DailySalesReportSettingsProps {
    settings?: Record<string, any>;
}

export default function DailySalesReportSettings({ settings = {} }: DailySalesReportSettingsProps) {
    const { t } = useTranslation();
    const pageProps = usePage().props as any;

    const currentSettings = Object.keys(settings).length > 0
        ? settings
        : (pageProps.settings || pageProps.systemSettings || {});

    const [formState, setFormState] = useState({
        daily_report_enabled: currentSettings.daily_report_enabled !== 'off',
        daily_report_send_time: currentSettings.daily_report_send_time || '19:00',
        daily_report_days: currentSettings.daily_report_days || 'weekdays',
        daily_report_custom_cc: currentSettings.daily_report_custom_cc || '',
        daily_report_include_idle: currentSettings.daily_report_include_idle === 'on',
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);

    useEffect(() => {
        if (Object.keys(currentSettings).length > 0) {
            setFormState({
                daily_report_enabled: currentSettings.daily_report_enabled !== 'off',
                daily_report_send_time: currentSettings.daily_report_send_time || '19:00',
                daily_report_days: currentSettings.daily_report_days || 'weekdays',
                daily_report_custom_cc: currentSettings.daily_report_custom_cc || '',
                daily_report_include_idle: currentSettings.daily_report_include_idle === 'on',
            });
        }
    }, [currentSettings]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.post(route('settings.daily-report.update'), formState, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSaving(false);
                toast.success(t('Daily Sales Report settings saved successfully.'));
            },
            onError: (errors) => {
                setIsSaving(false);
                const msg = Object.values(errors)[0] as string || t('Failed to save settings.');
                toast.error(msg);
            },
        });
    };

    const handleSendTestReports = () => {
        if (!confirm(t('Send daily work reports right now to all active sales representatives with managers in CC?'))) {
            return;
        }

        setIsSendingTest(true);
        router.post(route('sales-day-plans.send-all-reports'), { force: true }, {
            preserveScroll: true,
            onSuccess: (page: any) => {
                setIsSendingTest(false);
                const flash = page?.props?.flash;
                if (flash?.error) {
                    toast.error(flash.error);
                } else if (flash?.warning) {
                    toast.warning(flash.warning);
                } else if (flash?.success) {
                    toast.success(flash.success);
                } else {
                    toast.success(t('Test daily reports dispatched successfully! Check recipient inboxes.'));
                }
            },
            onError: (errors: any) => {
                setIsSendingTest(false);
                const errorMsg = (errors && typeof errors === 'object' && Object.values(errors)[0])
                    ? String(Object.values(errors)[0])
                    : t('Failed to dispatch test reports. Please check your SMTP email settings.');
                toast.error(errorMsg);
            },
        });
    };

    const timezone = currentSettings.defaultTimezone || currentSettings.timezone || 'UTC';
    const lastSent = currentSettings.daily_report_last_sent_date;

    return (
        <SettingsSection
            title={t('Daily Sales Report Settings')}
            description={t('Configure automated daily evening work report dispatches, scheduled send time, active days, and manager CC recipients')}
            action={
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSendingTest || isSaving}
                        onClick={handleSendTestReports}
                        className="cursor-pointer"
                    >
                        <Send className="h-4 w-4 mr-2 text-primary" />
                        {isSendingTest ? t('Dispatching...') : t('Send Test Reports Now')}
                    </Button>
                    <Button
                        type="submit"
                        form="daily-sales-report-form"
                        size="sm"
                        disabled={isSaving}
                        className="cursor-pointer"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? t('Saving...') : t('Save Changes')}
                    </Button>
                </div>
            }
        >
            <Card>
                <CardContent className="pt-6">
                    <form id="daily-sales-report-form" onSubmit={handleSave} className="space-y-6">
                        {/* Master Enable/Disable Banner */}
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <Label htmlFor="dailyReportEnabled" className="text-sm font-semibold cursor-pointer">
                                        {t('Automated Daily Evening Reports')}
                                    </Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t('When enabled, a comprehensive daily performance summary is automatically emailed to each sales rep with their managers in CC.')}
                                </p>
                            </div>
                            <Switch
                                id="dailyReportEnabled"
                                checked={formState.daily_report_enabled}
                                onCheckedChange={(val) => setFormState({ ...formState, daily_report_enabled: val })}
                            />
                        </div>

                        {/* Timing and Schedule Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="dailySendTime" className="text-xs font-semibold flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    {t('Evening Dispatch Time')}
                                </Label>
                                <Select
                                    value={formState.daily_report_send_time}
                                    onValueChange={(val) => setFormState({ ...formState, daily_report_send_time: val })}
                                >
                                    <SelectTrigger id="dailySendTime" className="h-10">
                                        <SelectValue placeholder={t('Select dispatch time')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="17:00">5:00 PM (17:00)</SelectItem>
                                        <SelectItem value="17:30">5:30 PM (17:30)</SelectItem>
                                        <SelectItem value="18:00">6:00 PM (18:00)</SelectItem>
                                        <SelectItem value="18:30">6:30 PM (18:30)</SelectItem>
                                        <SelectItem value="19:00">7:00 PM (19:00 - Recommended)</SelectItem>
                                        <SelectItem value="19:30">7:30 PM (19:30)</SelectItem>
                                        <SelectItem value="20:00">8:00 PM (20:00)</SelectItem>
                                        <SelectItem value="20:30">8:30 PM (20:30)</SelectItem>
                                        <SelectItem value="21:00">9:00 PM (21:00)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                    {t('Reports will be evaluated and dispatched around this time in your company timezone.')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dailyScheduleDays" className="text-xs font-semibold flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    {t('Active Schedule Days')}
                                </Label>
                                <Select
                                    value={formState.daily_report_days}
                                    onValueChange={(val) => setFormState({ ...formState, daily_report_days: val })}
                                >
                                    <SelectTrigger id="dailyScheduleDays" className="h-10">
                                        <SelectValue placeholder={t('Select active days')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekdays">{t('Monday – Friday (Working Days Only)')}</SelectItem>
                                        <SelectItem value="everyday">{t('Everyday (All 7 Days)')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                    {t('Choose whether to send reports on weekends or exclusively during Monday-Friday.')}
                                </p>
                            </div>
                        </div>

                        {/* Additional CC Emails */}
                        <div className="space-y-2">
                            <Label htmlFor="customCcEmails" className="text-xs font-semibold flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                {t('Additional Manager / Stakeholder CC Emails')}
                            </Label>
                            <Input
                                id="customCcEmails"
                                type="text"
                                placeholder={t('director@company.com, headofsales@company.com')}
                                value={formState.daily_report_custom_cc}
                                onChange={(e) => setFormState({ ...formState, daily_report_custom_cc: e.target.value })}
                                className="h-10 text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {t('Direct sales managers and the company owner are already CC\'d automatically. Enter comma-separated email addresses here for any additional executives or auditors.')}
                            </p>
                        </div>

                        {/* Include Inactive / Idle Reps */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                            <div className="space-y-0.5">
                                <Label htmlFor="includeIdleRep" className="text-xs font-medium cursor-pointer">
                                    {t('Include Inactive / Idle Representatives')}
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    {t('Send report even if the sales rep recorded zero calls, meetings, or deals today (shows a 0-telemetry scorecard to encourage accountability).')}
                                </p>
                            </div>
                            <Switch
                                id="includeIdleRep"
                                checked={formState.daily_report_include_idle}
                                onCheckedChange={(val) => setFormState({ ...formState, daily_report_include_idle: val })}
                            />
                        </div>

                        {/* Timezone & Delivery Telemetry Footnote */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/40 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>
                                    {t('Company Timezone')}: <strong className="text-foreground">{timezone}</strong>
                                    {' '}
                                    <span className="text-[11px] text-muted-foreground">({t('Configure under System Settings')})</span>
                                </span>
                            </div>
                            {lastSent && (
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>{t('Last Dispatched')}: {lastSent}</span>
                                </div>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </SettingsSection>
    );
}
