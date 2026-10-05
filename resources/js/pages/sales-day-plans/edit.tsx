import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router, Link } from '@inertiajs/react';
import { 
    Calendar, User, Phone, Users, TrendingUp, CheckCircle, 
    ArrowLeft, Target, Sparkles, Send, FileText, ClipboardList,
    AlertTriangle, Lightbulb, CheckCheck, Save, MailCheck, RefreshCw,
    Briefcase, MessageSquare, Award, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { getCurrencySymbol } from '@/utils/helper';

export default function SalesDayPlanEdit() {
    const { t } = useTranslation();
    const { auth, dayPlan, teamUsers = [], canViewAll = false } = usePage().props as any;

    const [isAutoPulling, setIsAutoPulling] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        plan_date: dayPlan.plan_date || '',
        user_id: String(dayPlan.user_id || ''),
        title: dayPlan.title || '',
        sales_target_id: dayPlan.sales_target_id ? String(dayPlan.sales_target_id) : '',
        
        // Planned Targets
        target_calls: dayPlan.target_calls ?? 0,
        target_meetings: dayPlan.target_meetings ?? 0,
        target_demos: dayPlan.target_demos ?? 0,
        target_outreach: dayPlan.target_outreach ?? 0,
        target_emails: dayPlan.target_emails ?? 0,
        target_leads: dayPlan.target_leads ?? 0,
        target_followups: dayPlan.target_followups ?? 0,
        target_proposals: dayPlan.target_proposals ?? 0,
        target_sales_amount: dayPlan.target_sales_amount ?? 0,
        
        planned_activities: dayPlan.planned_activities || '',
        planned_accounts: dayPlan.planned_accounts || '',

        // Actual Accomplishments (EOD)
        actual_calls: dayPlan.actual_calls ?? 0,
        actual_meetings: dayPlan.actual_meetings ?? 0,
        actual_demos: dayPlan.actual_demos ?? 0,
        actual_outreach: dayPlan.actual_outreach ?? 0,
        actual_emails: dayPlan.actual_emails ?? 0,
        actual_leads: dayPlan.actual_leads ?? 0,
        actual_followups: dayPlan.actual_followups ?? 0,
        actual_proposals: dayPlan.actual_proposals ?? 0,
        actual_sales_amount: dayPlan.actual_sales_amount ?? 0,
        new_pipeline_created: dayPlan.new_pipeline_created ?? 0,
        proposal_value: dayPlan.proposal_value ?? 0,

        // EOD Reflection
        key_wins: dayPlan.key_wins || dayPlan.achievements_summary || '',
        challenges_notes: dayPlan.challenges_notes || '',
        client_feedback: dayPlan.client_feedback || '',
        support_needed: dayPlan.support_needed || '',
        next_day_plan: dayPlan.next_day_plan || '',
        status: dayPlan.status || 'submitted',
        send_email_now: false,
    });

    const handleAutoPullCrmData = async () => {
        setIsAutoPulling(true);
        try {
            const url = route('targets.recommend-daily', { user_id: data.user_id, date: data.plan_date });
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (res.ok) {
                const json = await res.json();
                const actuals = json.crm_actuals || {};
                setData((prev) => ({
                    ...prev,
                    actual_calls: actuals.actual_calls !== undefined ? actuals.actual_calls : prev.actual_calls,
                    actual_meetings: actuals.actual_meetings !== undefined ? actuals.actual_meetings : prev.actual_meetings,
                    actual_leads: actuals.actual_leads !== undefined ? actuals.actual_leads : prev.actual_leads,
                    actual_proposals: actuals.actual_proposals !== undefined ? actuals.actual_proposals : prev.actual_proposals,
                    new_pipeline_created: actuals.new_pipeline_created !== undefined ? actuals.new_pipeline_created : prev.new_pipeline_created,
                    actual_sales_amount: actuals.actual_sales_amount !== undefined ? actuals.actual_sales_amount : prev.actual_sales_amount,
                }));
                toast.success(t('Actual CRM activities (calls, meetings, leads, proposals, revenue) auto-synced!'));
            }
        } catch (err) {
            toast.error(t('Failed to pull CRM data'));
        } finally {
            setIsAutoPulling(false);
        }
    };

    const handleSubmit = (sendEmail = false) => {
        data.send_email_now = sendEmail;
        put(route('sales-day-plans.update', dayPlan.id), {
            onSuccess: () => {
                toast.success(
                    sendEmail 
                        ? t('EOD Daily Report submitted and emailed successfully!') 
                        : t('Daily Sales Plan updated successfully!')
                );
            },
            onError: () => {
                toast.error(t('Please check form fields for errors.'));
            }
        });
    };

    return (
        <PageTemplate
            title={`🌙 ${t('End of Day (EOD) Report & Day Plan')} (${data.plan_date})`}
            description={t('Record actual accomplishments, review plan vs actuals, and submit EOD reflections.')}
            url={route('sales-day-plans.edit', dayPlan.id)}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Daily Sales Plans'), href: route('sales-day-plans.index') },
                { title: dayPlan.plan_date, href: route('sales-day-plans.show', dayPlan.id) },
                { title: t('EOD Report'), href: route('sales-day-plans.edit', dayPlan.id) },
            ]}
        >
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.get(route('sales-day-plans.show', dayPlan.id))}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        {t('Back to Report View')}
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isAutoPulling}
                            onClick={handleAutoPullCrmData}
                            className="text-xs bg-muted/40 font-semibold"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isAutoPulling ? 'animate-spin' : 'text-primary'}`} />
                            {t('Auto-Pull CRM Data')}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={processing}
                            onClick={() => handleSubmit(false)}
                            className="text-xs font-medium"
                        >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {t('Save Draft')}
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            disabled={processing}
                            onClick={() => handleSubmit(true)}
                            className="bg-primary text-primary-foreground text-xs font-semibold"
                        >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            {t('Submit EOD Report')}
                        </Button>
                    </div>
                </div>

                {/* 1. Plan vs Actual Accomplishments Matrix */}
                <Card className="shadow-sm border-l-4 border-l-primary">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <CheckCheck className="h-5 w-5 text-primary" />
                                    {t('Today\'s Plan vs Actual Activity Matrix')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Compare planned morning goals with actual activities logged throughout the day.')}
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAutoPullCrmData}
                                className="text-xs text-primary font-semibold h-7"
                            >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {t('Sync CRM Calls/Meetings')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Calls */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                                    {t('Calls (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Planned"
                                        value={data.target_calls}
                                        onChange={(e) => setData('target_calls', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Actual"
                                        value={data.actual_calls}
                                        onChange={(e) => setData('actual_calls', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold text-blue-600"
                                    />
                                </div>
                            </div>

                            {/* Meetings */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-purple-600" />
                                    {t('Meetings (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Planned"
                                        value={data.target_meetings}
                                        onChange={(e) => setData('target_meetings', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Actual"
                                        value={data.actual_meetings}
                                        onChange={(e) => setData('actual_meetings', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold text-purple-600"
                                    />
                                </div>
                            </div>

                            {/* Demos */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                                    {t('Demos (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Planned"
                                        value={data.target_demos}
                                        onChange={(e) => setData('target_demos', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Actual"
                                        value={data.actual_demos}
                                        onChange={(e) => setData('actual_demos', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold text-amber-600"
                                    />
                                </div>
                            </div>

                            {/* Outreach */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Target className="h-3.5 w-3.5 text-primary" />
                                    {t('Outreach (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Planned"
                                        value={data.target_outreach}
                                        onChange={(e) => setData('target_outreach', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Actual"
                                        value={data.actual_outreach}
                                        onChange={(e) => setData('actual_outreach', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold text-primary"
                                    />
                                </div>
                            </div>

                            {/* Cold Emails */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground">
                                    {t('Emails (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_emails}
                                        onChange={(e) => setData('target_emails', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.actual_emails}
                                        onChange={(e) => setData('actual_emails', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold"
                                    />
                                </div>
                            </div>

                            {/* New Leads */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground">
                                    {t('Leads (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_leads}
                                        onChange={(e) => setData('target_leads', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.actual_leads}
                                        onChange={(e) => setData('actual_leads', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold text-emerald-600"
                                    />
                                </div>
                            </div>

                            {/* Proposals Sent */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground">
                                    {t('Proposals Sent (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_proposals}
                                        onChange={(e) => setData('target_proposals', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.actual_proposals}
                                        onChange={(e) => setData('actual_proposals', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold"
                                    />
                                </div>
                            </div>

                            {/* Follow-ups */}
                            <div className="p-3 rounded-lg border bg-card/60 space-y-2">
                                <Label className="text-xs font-bold text-foreground">
                                    {t('Follow-ups (Planned / Actual)')}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_followups}
                                        onChange={(e) => setData('target_followups', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 bg-muted/30"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.actual_followups}
                                        onChange={(e) => setData('actual_followups', parseInt(e.target.value) || 0)}
                                        className="text-xs h-8 font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Today's Revenue & Pipeline Progress */}
                <Card className="shadow-sm border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <div>
                                <CardTitle className="text-base">{t('Today\'s Revenue & Pipeline Progress')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Revenue won, new pipeline created, and quote proposal values generated today.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                                <Label className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                    {t('Revenue Won Closed Today')} ({getCurrencySymbol()})
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.actual_sales_amount}
                                    onChange={(e) => setData('actual_sales_amount', parseFloat(e.target.value) || 0)}
                                    className="text-sm font-bold text-emerald-600 dark:text-emerald-400 h-9"
                                />
                            </div>

                            <div className="space-y-1.5 p-3 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
                                <Label className="text-xs font-bold text-blue-800 dark:text-blue-300">
                                    {t('New Pipeline Created Today')} ({getCurrencySymbol()})
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.new_pipeline_created}
                                    onChange={(e) => setData('new_pipeline_created', parseFloat(e.target.value) || 0)}
                                    className="text-sm font-bold text-blue-600 dark:text-blue-400 h-9"
                                />
                            </div>

                            <div className="space-y-1.5 p-3 rounded-lg bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
                                <Label className="text-xs font-bold text-purple-800 dark:text-purple-300">
                                    {t('Total Proposal Value Sent')} ({getCurrencySymbol()})
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.proposal_value}
                                    onChange={(e) => setData('proposal_value', parseFloat(e.target.value) || 0)}
                                    className="text-sm font-bold text-purple-600 dark:text-purple-400 h-9"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. EOD Structured Reflection */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <div>
                                <CardTitle className="text-base">{t('🌙 End of Day Reflections & Insights')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Structured commentary for team collaboration and manager support.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        {/* Key Wins */}
                        <div className="space-y-1.5">
                            <Label htmlFor="key_wins" className="text-xs font-bold text-foreground flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-emerald-600" />
                                {t('1. Key Wins & Achievements')}
                            </Label>
                            <Textarea
                                id="key_wins"
                                rows={2}
                                placeholder={t('e.g., Client confirmed contract terms, agreed on proposal.')}
                                value={data.key_wins}
                                onChange={(e) => setData('key_wins', e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        {/* Challenges / Blockers */}
                        <div className="space-y-1.5">
                            <Label htmlFor="challenges_notes" className="text-xs font-bold text-foreground flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                {t('2. Challenges / Objections / Blockers Encountered')}
                            </Label>
                            <Textarea
                                id="challenges_notes"
                                rows={2}
                                placeholder={t('e.g., Prospect asked for custom API integration with legacy ERP.')}
                                value={data.challenges_notes}
                                onChange={(e) => setData('challenges_notes', e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        {/* Client Feedback */}
                        <div className="space-y-1.5">
                            <Label htmlFor="client_feedback" className="text-xs font-bold text-foreground flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                                {t('3. Important Client Feedback')}
                            </Label>
                            <Textarea
                                id="client_feedback"
                                rows={2}
                                placeholder={t('e.g., Clients love the AI WhatsApp automation demo; pricing for add-on agents is standard.')}
                                value={data.client_feedback}
                                onChange={(e) => setData('client_feedback', e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        {/* Follow-up required tomorrow */}
                        <div className="space-y-1.5">
                            <Label htmlFor="next_day_plan" className="text-xs font-bold text-foreground flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                                {t('4. Follow-up Required Tomorrow')}
                            </Label>
                            <Textarea
                                id="next_day_plan"
                                rows={2}
                                placeholder={t('e.g., Send revised scope agreement to ABC School at 10 AM.')}
                                value={data.next_day_plan}
                                onChange={(e) => setData('next_day_plan', e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        {/* Support required from Manager */}
                        <div className="space-y-1.5">
                            <Label htmlFor="support_needed" className="text-xs font-bold text-foreground flex items-center gap-1">
                                <Lightbulb className="h-3.5 w-3.5 text-indigo-600" />
                                {t('5. Support Required from Manager / Solutions Head')}
                            </Label>
                            <Textarea
                                id="support_needed"
                                rows={2}
                                placeholder={t('e.g., Need senior architect approval for ERP webhook security review.')}
                                value={data.support_needed}
                                onChange={(e) => setData('support_needed', e.target.value)}
                                className="text-xs"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Submission Bar */}
                <Card className="shadow-sm bg-muted/10">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="send_email_now_bottom"
                                checked={data.send_email_now}
                                onCheckedChange={(checked) => setData('send_email_now', Boolean(checked))}
                            />
                            <Label htmlFor="send_email_now_bottom" className="text-xs font-medium cursor-pointer">
                                {t('Email complete EOD summary to manager upon submit')}
                            </Label>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.get(route('sales-day-plans.show', dayPlan.id))}
                                disabled={processing}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="button"
                                disabled={processing}
                                onClick={() => handleSubmit(false)}
                                variant="outline"
                                className="font-semibold"
                            >
                                <Save className="h-4 w-4 mr-1" />
                                {t('Save Draft')}
                            </Button>
                            <Button
                                type="button"
                                disabled={processing}
                                onClick={() => handleSubmit(true)}
                                className="bg-primary text-primary-foreground font-semibold"
                            >
                                <Send className="h-4 w-4 mr-1.5" />
                                {processing ? t('Submitting...') : t('Submit EOD Report')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageTemplate>
    );
}
