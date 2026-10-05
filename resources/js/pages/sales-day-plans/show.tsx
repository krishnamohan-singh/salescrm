import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { 
    Calendar, User, Phone, Users, TrendingUp, CheckCircle, 
    ArrowLeft, Target, Sparkles, Send, FileText, ClipboardList,
    AlertTriangle, Lightbulb, CheckCheck, Edit, MailCheck, Printer,
    Clock, MessageSquare, Award, ShieldCheck, HelpCircle, Briefcase,
    Layers, Mail, ShieldAlert, CheckCircle2, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { formatCurrency } from '@/utils/helper';

const statusConfig: Record<string, { label: string; className: string }> = {
    draft:       { label: 'Draft',       className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' },
    in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' },
    submitted:   { label: 'Submitted',   className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400' },
    completed:   { label: 'Completed',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' },
    reviewed:    { label: 'Reviewed',    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400' },
    approved:    { label: 'Approved',    className: 'bg-emerald-600 text-white border-emerald-700' },
};

function UserAvatar({ name, src }: { name: string; src?: string }) {
    const [hasError, setHasError] = useState(false);
    if (src && !hasError) {
        return <img src={src} alt={name} onError={() => setHasError(true)} className="h-10 w-10 rounded-full object-cover border-2 border-primary/20" />;
    }
    return (
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center border-2 border-primary/20 uppercase">
            {name ? name.charAt(0) : 'U'}
        </div>
    );
}

export default function SalesDayPlanShow() {
    const { t } = useTranslation();
    const { auth, dayPlan, canViewAll = false } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // Manager Action Modals
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [approvalReason, setApprovalReason] = useState(dayPlan.manager_approval_reason || 'Approved plan commitment with adjusted activities');
    const [isApproving, setIsApproving] = useState(false);

    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [revisionComments, setRevisionComments] = useState('');
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);

    const [managerFeedback, setManagerFeedback] = useState(dayPlan.manager_feedback || '');
    const [reviewStatus, setReviewStatus] = useState(dayPlan.status === 'reviewed' ? 'reviewed' : 'completed');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const isCompanyOrAdmin = ['company', 'admin', 'superadmin'].includes((auth?.user?.type || '').toLowerCase());
    const isOwner = Number(dayPlan.user_id) === Number(auth?.user?.id);

    // Manager / Leadership approval & revision actions
    const canApprove = isCompanyOrAdmin || hasPermission(permissions, 'approve-sales-day-plans') || hasPermission(permissions, 'review-sales-day-plans');

    // Manager review & coaching feedback form
    const canReview = isCompanyOrAdmin || hasPermission(permissions, 'review-sales-day-plans') || hasPermission(permissions, 'approve-sales-day-plans');

    // Sales representative actions
    const canEdit = hasPermission(permissions, 'edit-sales-day-plans') || (isOwner && hasPermission(permissions, 'create-sales-day-plans'));
    const canSendReport = hasPermission(permissions, 'send-sales-day-plans') || isOwner;

    const badge = statusConfig[dayPlan.status] || statusConfig.draft;

    const handleSendReport = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingEmail(true);
        router.post(route('sales-day-plans.send-report', dayPlan.id), {
            recipient_email: recipientEmail || undefined,
        }, {
            onSuccess: () => {
                setIsEmailModalOpen(false);
                setIsSendingEmail(false);
                toast.success(t('Daily Sales Report email dispatched successfully!'));
            },
            onError: () => {
                setIsSendingEmail(false);
                toast.error(t('Failed to send email.'));
            }
        });
    };

    const handleApproveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsApproving(true);
        router.post(route('sales-day-plans.approve-plan', dayPlan.id), {
            manager_approval_reason: approvalReason,
            manager_feedback: managerFeedback,
        }, {
            onSuccess: () => {
                setIsApproveModalOpen(false);
                setIsApproving(false);
                toast.success(t('Daily Sales Plan approved by manager.'));
            },
            onError: () => {
                setIsApproving(false);
                toast.error(t('Failed to approve plan.'));
            }
        });
    };

    const handleRevisionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!revisionComments.trim()) {
            toast.error(t('Please provide revision instructions.'));
            return;
        }
        setIsRequestingRevision(true);
        router.post(route('sales-day-plans.request-revision', dayPlan.id), {
            revision_comments: revisionComments,
        }, {
            onSuccess: () => {
                setIsRevisionModalOpen(false);
                setIsRequestingRevision(false);
                toast.success(t('Revision request dispatched to salesperson.'));
            },
            onError: () => {
                setIsRequestingRevision(false);
                toast.error(t('Failed to request revision.'));
            }
        });
    };

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingReview(true);
        router.post(route('sales-day-plans.review', dayPlan.id), {
            manager_feedback: managerFeedback,
            status: reviewStatus,
        }, {
            onSuccess: () => {
                setIsSubmittingReview(false);
                toast.success(t('Manager review updated successfully.'));
            },
            onError: () => {
                setIsSubmittingReview(false);
                toast.error(t('Failed to save manager review.'));
            }
        });
    };

    const formatMoney = (val: number | string) => {
        return formatCurrency(val);
    };

    const targetGap = dayPlan.target_gap_json || {};

    return (
        <PageTemplate
            title={`${t('Daily Sales Report')} - ${dayPlan.plan_date}`}
            description={t('Comprehensive daily plan, actual achievements, and manager evaluation.')}
            url={route('sales-day-plans.show', dayPlan.id)}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Daily Sales Plans'), href: route('sales-day-plans.index') },
                { title: `${dayPlan.plan_date} (${dayPlan.user?.name || 'Report'})`, href: route('sales-day-plans.show', dayPlan.id) },
            ]}
        >
            <div className="max-w-5xl mx-auto space-y-6 print:m-0 print:p-0">
                {/* ── Top Header Actions Bar ──────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.get(route('sales-day-plans.index'))}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        {t('Back to Day Plans')}
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => window.print()}
                        >
                            <Printer className="h-3.5 w-3.5 mr-1" />
                            {t('Print / PDF')}
                        </Button>

                        {/* Manager Approval & Revision Controls */}
                        {canApprove && (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    onClick={() => setIsApproveModalOpen(true)}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    {dayPlan.manager_approved ? t('Plan Approved ✓') : t('Approve Plan')}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-50"
                                    onClick={() => setIsRevisionModalOpen(true)}
                                >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    {t('Ask to Revise')}
                                </Button>
                            </>
                        )}

                        {canSendReport && (
                            <Button
                                type="button"
                                size="sm"
                                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                onClick={() => setIsEmailModalOpen(true)}
                            >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                {t('Send Report Email')}
                            </Button>
                        )}

                        {canEdit && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="text-xs font-semibold"
                                onClick={() => router.get(route('sales-day-plans.edit', dayPlan.id))}
                            >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                {t('Update EOD Report')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Below Target & Reachability Warning Alert (If applicable) ── */}
                {dayPlan.is_below_target && (
                    <Card className="shadow-sm border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                                    <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                        ⚠️ {t('Daily Plan Committed Below Manager Target Pace')}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    {dayPlan.manager_approved ? (
                                        <Badge className="bg-emerald-600 text-white text-[11px] font-semibold">
                                            ✓ {t('Manager Approved')}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 text-[11px]">
                                            {t('Pending Manager Review')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                                {targetGap.revenue_gap !== undefined && (
                                    <div className="p-2 rounded bg-background border">
                                        <span className="text-muted-foreground">{t('Revenue Target Gap')}</span>
                                        <p className="font-bold text-rose-600">{formatMoney(targetGap.revenue_gap)}</p>
                                    </div>
                                )}
                                {targetGap.calls_gap !== undefined && (
                                    <div className="p-2 rounded bg-background border">
                                        <span className="text-muted-foreground">{t('Calls Gap')}</span>
                                        <p className="font-bold text-rose-600">{targetGap.calls_gap} {t('calls')}</p>
                                    </div>
                                )}
                                {targetGap.meetings_gap !== undefined && (
                                    <div className="p-2 rounded bg-background border">
                                        <span className="text-muted-foreground">{t('Meetings Gap')}</span>
                                        <p className="font-bold text-rose-600">{targetGap.meetings_gap} {t('meetings')}</p>
                                    </div>
                                )}
                                <div className="p-2 rounded bg-background border">
                                    <span className="text-muted-foreground">{t('Reachability Status')}</span>
                                    <p className="font-bold capitalize text-amber-600 dark:text-amber-400">{dayPlan.reachability_status?.replace('_', ' ') || 'At Risk'}</p>
                                </div>
                            </div>

                            {dayPlan.shortage_reason && (
                                <div className="p-2.5 bg-background rounded-lg border text-xs text-foreground mt-2">
                                    <strong>{t('Salesperson\'s Explanation:')}</strong> {dayPlan.shortage_reason}
                                </div>
                            )}

                            {dayPlan.manager_approved && dayPlan.manager_approval_reason && (
                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                                    <strong>{t('Manager Override Reason:')}</strong> {dayPlan.manager_approval_reason}
                                </div>
                            )}

                            {dayPlan.revision_requested && dayPlan.revision_comments && (
                                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
                                    <strong>{t('Revision Request Notes:')}</strong> {dayPlan.revision_comments}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Report Executive Header Banner ──────────────────────── */}
                <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <UserAvatar name={dayPlan.user?.name || 'User'} src={dayPlan.user?.avatar} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold">{dayPlan.user?.name}</h2>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{dayPlan.user?.email}</p>
                                    {dayPlan.title && (
                                        <p className="text-sm font-semibold text-primary mt-1">{dayPlan.title}</p>
                                    )}
                                    {dayPlan.sales_target && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                                            <span>{t('Monthly Target:')}</span>
                                            <Link href={route('targets.show', dayPlan.sales_target.id)} className="font-semibold text-primary hover:underline">
                                                {dayPlan.sales_target.title}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Date & Dispatch Info */}
                            <div className="flex flex-col md:items-end text-xs space-y-1 text-muted-foreground border-t md:border-t-0 pt-3 md:pt-0">
                                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span>{t('Report Date')}: {dayPlan.plan_date}</span>
                                </div>
                                {dayPlan.report_sent_at ? (
                                    <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                        <MailCheck className="h-3.5 w-3.5" />
                                        <span>{t('Report Sent')}: {new Date(dayPlan.report_sent_at).toLocaleString()}</span>
                                    </div>
                                ) : (
                                    <div className="text-amber-600 italic">
                                        <span>{t('Email report not sent yet')}</span>
                                    </div>
                                )}
                                {dayPlan.reviewed_at && (
                                    <div className="flex items-center gap-1 text-purple-600 font-medium">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        <span>{t('Reviewed by')} {dayPlan.reviewer?.name || t('Manager')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── KPI Targets vs Actuals Cards ───────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Calls Card */}
                    <Card className="shadow-sm border-l-4 border-l-emerald-500">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                <span className="flex items-center gap-1.5">
                                    <Phone className="h-4 w-4" />
                                    {t('Calls Completed')}
                                </span>
                                <span className="text-xs font-bold">{dayPlan.calls_completion_rate}%</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{dayPlan.actual_calls}</span>
                                <span className="text-sm text-muted-foreground">/ {dayPlan.target_calls} {t('target')}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, dayPlan.calls_completion_rate)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Meetings & Demos Card */}
                    <Card className="shadow-sm border-l-4 border-l-purple-500">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-400">
                                <span className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4" />
                                    {t('Meetings / Demos')}
                                </span>
                                <span className="text-xs font-bold">{dayPlan.meetings_completion_rate}%</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{dayPlan.actual_meetings}</span>
                                <span className="text-sm text-muted-foreground">/ {dayPlan.target_meetings} {t('target')}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-purple-500 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, dayPlan.meetings_completion_rate)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Outreach & Leads */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400">
                                <span className="flex items-center gap-1.5">
                                    <Target className="h-4 w-4" />
                                    {t('Outreach & Leads')}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                                    {dayPlan.actual_outreach || dayPlan.actual_leads}
                                </span>
                                <span className="text-sm text-muted-foreground">/ {dayPlan.target_outreach || dayPlan.target_leads} {t('target')}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, dayPlan.overall_completion_rate || 0)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sales Closed */}
                    <Card className="shadow-sm border-l-4 border-l-amber-500">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
                                <span className="flex items-center gap-1.5">
                                    <TrendingUp className="h-4 w-4" />
                                    {t('Revenue Won Closed')}
                                </span>
                                <span className="text-xs font-bold">{dayPlan.sales_completion_rate}%</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatMoney(dayPlan.actual_sales_amount)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{t('Target:')} {formatMoney(dayPlan.target_sales_amount)}</p>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-amber-500 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, dayPlan.sales_completion_rate)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pipeline Impact Today */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="shadow-sm bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/40">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">{t('New Pipeline Created Today')}</p>
                                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatMoney(dayPlan.new_pipeline_created || 0)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500/40" />
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/40">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">{t('Quotes / Proposal Value Sent')}</p>
                                <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{formatMoney(dayPlan.proposal_value || 0)}</p>
                            </div>
                            <FileText className="h-8 w-8 text-purple-500/40" />
                        </CardContent>
                    </Card>
                </div>

                {/* ── Detailed Content Sections ──────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Morning Plan & Planned Agenda */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-blue-600" />
                                <CardTitle className="text-sm font-semibold">{t('1. Morning Schedule & Agenda')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {dayPlan.planned_activities ? (
                                <p className="text-xs whitespace-pre-line leading-relaxed text-foreground/90">
                                    {dayPlan.planned_activities}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">{t('No morning agenda recorded.')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Target Accounts & Opportunities */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-indigo-600" />
                                <CardTitle className="text-sm font-semibold">{t('2. Priority Focus Accounts & Deals')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {dayPlan.planned_accounts ? (
                                <p className="text-xs whitespace-pre-line leading-relaxed text-foreground/90">
                                    {dayPlan.planned_accounts}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">{t('No specific accounts listed.')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Daily Accomplishments & Wins */}
                    <Card className="shadow-sm md:col-span-2 border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-emerald-600" />
                                <CardTitle className="text-sm font-semibold">{t('3. Key Wins & EOD Highlights')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {(dayPlan.key_wins || dayPlan.achievements_summary) ? (
                                <p className="text-xs whitespace-pre-line leading-relaxed text-foreground/90 font-medium">
                                    {dayPlan.key_wins || dayPlan.achievements_summary}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">{t('No EOD accomplishments recorded yet.')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Roadblocks & Challenges */}
                    <Card className="shadow-sm border-l-4 border-l-amber-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                                <CardTitle className="text-sm font-semibold">{t('4. Challenges, Objections & Blockers')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {dayPlan.challenges_notes ? (
                                <p className="text-xs whitespace-pre-line leading-relaxed text-foreground/90">
                                    {dayPlan.challenges_notes}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">{t('No blockers reported.')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Important Client Feedback */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <MessageSquare className="h-4 w-4" />
                                <CardTitle className="text-sm font-semibold">{t('5. Important Client Feedback')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {dayPlan.client_feedback ? (
                                <p className="text-xs whitespace-pre-line leading-relaxed text-foreground/90">
                                    {dayPlan.client_feedback}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">{t('No specific client feedback logged.')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tomorrow's Follow-up Plan */}
                    <Card className="shadow-sm border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                <Calendar className="h-4 w-4" />
                                <CardTitle className="text-sm font-semibold">{t("6. Follow-up Required Tomorrow")}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {dayPlan.next_day_plan ? (
                                <p className="text-xs whitespace-pre-line leading-relaxed text-foreground/90">
                                    {dayPlan.next_day_plan}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">{t("No next day plan specified.")}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Support Required from Manager */}
                    <Card className="shadow-sm border-l-4 border-l-indigo-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <Lightbulb className="h-4 w-4" />
                                <CardTitle className="text-sm font-semibold">{t('7. Support Needed from Manager')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {dayPlan.support_needed ? (
                                <p className="text-xs whitespace-pre-line leading-relaxed text-foreground/90">
                                    {dayPlan.support_needed}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">{t('No immediate manager support requested.')}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Manager Evaluation & Coaching Feedback ──────────────── */}
                <Card className="shadow-sm border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCheck className="h-5 w-5 text-purple-600" />
                                <div>
                                    <CardTitle className="text-base">{t('8. Manager Review, Approval & Coaching')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Evaluation, plan approval overrides, and coaching guidance from leadership.')}
                                    </CardDescription>
                                </div>
                            </div>
                            {dayPlan.reviewer && (
                                <div className="text-xs text-muted-foreground">
                                    <span>{t('Reviewed by')} <strong>{dayPlan.reviewer.name}</strong></span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        {!canReview && (
                            <div>
                                {dayPlan.manager_feedback ? (
                                    <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/40 text-xs leading-relaxed">
                                        <p className="font-medium text-foreground">{dayPlan.manager_feedback}</p>
                                        {dayPlan.reviewed_at && (
                                            <p className="text-[10px] text-muted-foreground mt-2">
                                                {t('Reviewed at')}: {new Date(dayPlan.reviewed_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">{t('Manager review pending.')}</p>
                                )}
                            </div>
                        )}

                        {canReview && (
                            <form onSubmit={handleReviewSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="mgr_feedback" className="text-xs font-semibold">
                                        {t('Manager Coaching Feedback & Guidance')}
                                    </Label>
                                    <Textarea
                                        id="mgr_feedback"
                                        rows={3}
                                        placeholder={t('Add constructive coaching comments, celebrate wins, or suggest action items...')}
                                        value={managerFeedback}
                                        onChange={(e) => setManagerFeedback(e.target.value)}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold">{t('Plan Status')}:</Label>
                                        <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                            <SelectTrigger className="h-8 w-44 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="approved">{t('Approved')}</SelectItem>
                                                <SelectItem value="reviewed">{t('Reviewed')}</SelectItem>
                                                <SelectItem value="completed">{t('Completed')}</SelectItem>
                                                <SelectItem value="submitted">{t('Submitted')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmittingReview}
                                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                                    >
                                        <CheckCheck className="h-4 w-4 mr-1.5" />
                                        {isSubmittingReview ? t('Saving Review...') : t('Save Manager Review')}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Dialog: Approve Lower Plan ──────────────────────────────── */}
            <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            {t('Approve Daily Sales Plan')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Authorize this salesperson\'s plan even if activity numbers are below default targets.')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApproveSubmit} className="space-y-4 py-2">
                        <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                            <div><strong className="text-foreground">{t('Sales Rep')}:</strong> {dayPlan.user?.name}</div>
                            <div><strong className="text-foreground">{t('Date')}:</strong> {dayPlan.plan_date}</div>
                            {dayPlan.shortage_reason && (
                                <div className="text-amber-800 dark:text-amber-300 pt-1">
                                    <strong>{t('Rep\'s Explanation')}:</strong> {dayPlan.shortage_reason}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="approvalReason" className="text-xs font-semibold">
                                {t('Manager Approval Reason / Notes')} *
                            </Label>
                            <Input
                                id="approvalReason"
                                required
                                placeholder={t('e.g., Authorized lower prospecting due to high-value client meeting')}
                                value={approvalReason}
                                onChange={(e) => setApprovalReason(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsApproveModalOpen(false)}
                                disabled={isApproving}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isApproving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                {isApproving ? t('Approving...') : t('Confirm Plan Approval')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Dialog: Request Plan Revision ──────────────────────────── */}
            <Dialog open={isRevisionModalOpen} onOpenChange={setIsRevisionModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-amber-600" />
                            {t('Request Plan Revision')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Send this plan back to the salesperson with specific instructions to adjust commitment.')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRevisionSubmit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="revisionComments" className="text-xs font-semibold">
                                {t('Instructions for Salesperson')} *
                            </Label>
                            <Textarea
                                id="revisionComments"
                                required
                                rows={3}
                                placeholder={t('e.g., Please increase planned calls from 10 to at least 15 to stay on pace for monthly quota.')}
                                value={revisionComments}
                                onChange={(e) => setRevisionComments(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRevisionModalOpen(false)}
                                disabled={isRequestingRevision}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isRequestingRevision}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <Send className="h-4 w-4 mr-1.5" />
                                {isRequestingRevision ? t('Sending...') : t('Send Revision Request')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Dialog: Send Email Report ──────────────────────────────── */}
            <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-indigo-600" />
                            {t('Dispatch Daily Sales Report Email')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Send this executive HTML report directly to management or custom recipients.')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendReport} className="space-y-4 py-2">
                        <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                            <div><strong className="text-foreground">{t('Sales Rep')}:</strong> {dayPlan.user?.name}</div>
                            <div><strong className="text-foreground">{t('Date')}:</strong> {dayPlan.plan_date}</div>
                            <div><strong className="text-foreground">{t('Achievement')}:</strong> {dayPlan.completion_rate}%</div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="recipientEmail" className="text-xs font-semibold">
                                {t('Recipient Email')} <span className="text-muted-foreground font-normal">({t('leave blank for company default')})</span>
                            </Label>
                            <Input
                                id="recipientEmail"
                                type="email"
                                placeholder={t('manager@example.com')}
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEmailModalOpen(false)}
                                disabled={isSendingEmail}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSendingEmail}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Send className="h-4 w-4 mr-1.5" />
                                {isSendingEmail ? t('Sending...') : t('Send Report Now')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}
