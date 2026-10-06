import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { 
    Target, Plus, Search, Filter, Eye, Edit, Trash2, 
    CheckCircle2, AlertTriangle, AlertCircle, ArrowUpDown,
    Calendar, Users, DollarSign, Activity, Layers, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { formatCurrency } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';

export default function TargetList() {
    const { t } = useTranslation();
    const { 
        auth,
        targets = { data: [], links: [], meta: {} }, 
        teamUsers = [], 
        canViewAll = false, 
        filters = {} 
    } = usePage().props as any;

    const permissions = auth?.permissions || [];
    const isCompanyOrAdmin = ['company', 'admin', 'superadmin'].includes((auth?.user?.type || '').toLowerCase());
    const canAllocate = isCompanyOrAdmin || (canViewAll && (hasPermission(permissions, 'allocate-targets') || hasPermission(permissions, 'create-targets')));
    const canEditTarget = isCompanyOrAdmin || (canViewAll && hasPermission(permissions, 'edit-targets'));
    const canDeleteTarget = isCompanyOrAdmin || (canViewAll && hasPermission(permissions, 'delete-targets'));

    const [search, setSearch] = useState(filters.search || '');
    const [financialYear, setFinancialYear] = useState(filters.financial_year || 'all');
    const [periodType, setPeriodType] = useState(filters.period_type || 'all');
    const [businessType, setBusinessType] = useState(filters.business_type || 'all');
    const [userId, setUserId] = useState(filters.user_id || 'all');

    const handleFilterApply = (updates: Record<string, any> = {}) => {
        const queryParams = {
            search: updates.search !== undefined ? updates.search : search,
            financial_year: updates.financial_year !== undefined ? updates.financial_year : financialYear,
            period_type: updates.period_type !== undefined ? updates.period_type : periodType,
            business_type: updates.business_type !== undefined ? updates.business_type : businessType,
            user_id: updates.user_id !== undefined ? updates.user_id : userId,
        };
        router.get(route('targets.list'), queryParams, { preserveState: true, preserveScroll: true });
    };

    const handleDelete = (id: number, title: string) => {
        if (confirm(t(`Are you sure you want to delete target "${title}"?`))) {
            router.delete(route('targets.destroy', id), {
                onSuccess: () => toast.success(t('Target deleted successfully')),
            });
        }
    };

    const formatMoney = (val: number | string) => {
        return formatCurrency(val);
    };

    const getHealthBadge = (health: string) => {
        switch (health) {
            case 'on_track':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('On Track')}
                    </Badge>
                );
            case 'at_risk':
                return (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {t('At Risk')}
                    </Badge>
                );
            case 'critical':
                return (
                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {t('Critical')}
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{health || 'Active'}</Badge>;
        }
    };

    const getPeriodBadge = (period: string, quarter?: string, month?: number) => {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        switch (period) {
            case 'annual':
                return <Badge variant="default" className="bg-indigo-600">{t('Annual')}</Badge>;
            case 'quarterly':
                return <Badge className="bg-blue-600">{quarter || t('Quarterly')}</Badge>;
            case 'monthly':
                return <Badge className="bg-teal-600">{month ? monthNames[month] : t('Monthly')}</Badge>;
            case 'daily':
                return <Badge className="bg-amber-600">{t('Daily')}</Badge>;
            case 'weekly':
                return <Badge className="bg-orange-600">{t('Weekly')}</Badge>;
            case 'bi_weekly':
                return <Badge className="bg-purple-600">{t('2 Weeks')}</Badge>;
            default:
                return <Badge variant="outline">{period}</Badge>;
        }
    };

    return (
        <PageTemplate
            title={t('Sales Targets & Quota Allocation')}
            description={t('Manage and configure period-specific B2B targets across years, quarters, months and weeks.')}
            url={route('targets.list')}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Target List'), href: route('targets.list') },
            ]}
        >
            <div className="space-y-6">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Search targets or rep...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterApply({ search })}
                                className="pl-9 text-xs h-9"
                            />
                        </div>

                        {/* Period Type */}
                        <div className="w-36">
                            <Select 
                                value={periodType} 
                                onValueChange={(val) => {
                                    setPeriodType(val);
                                    handleFilterApply({ period_type: val });
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Periods')}</SelectItem>
                                    <SelectItem value="daily">{t('Daily')}</SelectItem>
                                    <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                                    <SelectItem value="bi_weekly">{t('Bi-Weekly')}</SelectItem>
                                    <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                                    <SelectItem value="quarterly">{t('Quarterly')}</SelectItem>
                                    <SelectItem value="annual">{t('Annual')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Financial Year */}
                        <div className="w-36">
                            <Select 
                                value={financialYear} 
                                onValueChange={(val) => {
                                    setFinancialYear(val);
                                    handleFilterApply({ financial_year: val });
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs font-semibold">
                                    <SelectValue placeholder="FY" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All FY')}</SelectItem>
                                    <SelectItem value="2025-26">FY 2025–26</SelectItem>
                                    <SelectItem value="2026-27">FY 2026–27</SelectItem>
                                    <SelectItem value="2027-28">FY 2027–28</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Business Category */}
                        <div className="w-36">
                            <Select 
                                value={businessType} 
                                onValueChange={(val) => {
                                    setBusinessType(val);
                                    handleFilterApply({ business_type: val });
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Types')}</SelectItem>
                                    <SelectItem value="services">{t('Services')}</SelectItem>
                                    <SelectItem value="solutions">{t('Solutions')}</SelectItem>
                                    <SelectItem value="saas">{t('SaaS')}</SelectItem>
                                    <SelectItem value="custom">{t('Custom')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Team Rep */}
                        {canViewAll && (
                            <div className="w-48">
                                <Select 
                                    value={userId} 
                                    onValueChange={(val) => {
                                        setUserId(val);
                                        handleFilterApply({ user_id: val });
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Sales Representative" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Sales Team')}</SelectItem>
                                        {teamUsers.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {canAllocate && (
                            <Button
                                size="sm"
                                className="h-9 text-xs font-semibold bg-primary text-primary-foreground shadow-sm"
                                onClick={() => router.get(route('targets.create'))}
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                {t('Allocate Target')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Targets Data Table */}
                <Card className="shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="text-xs font-semibold">{t('Target Name & Hierarchy')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Period')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Assigned Rep')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Target Revenue')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Achieved Won')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Rev Attainment')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Activity Attainment')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Health')}</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {targets.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-xs text-muted-foreground">
                                                <Target className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                                                <p className="font-semibold text-foreground">{t('No sales targets found.')}</p>
                                                <p className="mt-1">{t('Start by setting up annual, quarterly or monthly targets for your team.')}</p>
                                                {canAllocate && (
                                                    <Button
                                                        size="sm"
                                                        className="mt-3 bg-primary text-primary-foreground text-xs"
                                                        onClick={() => router.get(route('targets.create'))}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        {t('Create First Target')}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        targets.data.map((tgt: any) => (
                                            <TableRow
                                                key={tgt.id}
                                                className="hover:bg-muted/30 cursor-pointer"
                                                onClick={(e) => {
                                                    const target = e.target as HTMLElement;
                                                    if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                                        return;
                                                    }
                                                    const selection = window.getSelection();
                                                    if (selection && selection.toString().trim().length > 0) {
                                                        return;
                                                    }
                                                    router.get(route('targets.show', tgt.id));
                                                }}
                                            >
                                                <TableCell className="font-medium text-xs">
                                                    <div>
                                                        <Link 
                                                            href={route('targets.show', tgt.id)} 
                                                            className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                                                        >
                                                            {tgt.title}
                                                        </Link>
                                                        {tgt.parent && (
                                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <Layers className="h-2.5 w-2.5" />
                                                                {t('Parent:')} {tgt.parent.title}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {tgt.start_date} → {tgt.end_date}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getPeriodBadge(tgt.period_type, tgt.quarter, tgt.month)}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {tgt.user ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6 text-[10px]">
                                                                <AvatarImage src={tgt.user?.avatar} />
                                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                                    {tgt.user?.name?.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span>{tgt.user.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">{t('Company / Team Goal')}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold">
                                                    {formatMoney(tgt.target_revenue)}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatMoney(tgt.actual_revenue)}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold">{tgt.revenue_achievement_rate || 0}%</span>
                                                        <Progress value={Math.min(100, tgt.revenue_achievement_rate || 0)} className="h-1.5 w-12" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-muted-foreground">{tgt.activity_achievement_rate || 0}%</span>
                                                        <Progress value={Math.min(100, tgt.activity_achievement_rate || 0)} className="h-1.5 w-12" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {getHealthBadge(tgt.computed_health)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() => router.get(route('targets.show', tgt.id))}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {canEditTarget && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0"
                                                                onClick={() => router.get(route('targets.edit', tgt.id))}
                                                            >
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                        {canDeleteTarget && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                                onClick={() => handleDelete(tgt.id, tgt.title)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {targets.links && targets.links.length > 3 && (
                            <div className="p-4 border-t">
                                <Pagination links={targets.links} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageTemplate>
    );
}
