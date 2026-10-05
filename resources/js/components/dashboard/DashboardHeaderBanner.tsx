import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users, Crown, Calendar, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HeaderBannerProps {
    roleView: 'salesperson' | 'manager' | 'admin';
    onRoleChange: (role: 'salesperson' | 'manager' | 'admin') => void;
    allowedRoles?: ('salesperson' | 'manager' | 'admin')[];
    period: string;
    onPeriodChange: (period: string) => void;
    userName?: string;
    userRoleTitle?: string;
    canViewAllSalesData?: boolean;
    viewScope?: 'my' | 'all';
    onViewScopeChange?: (scope: 'my' | 'all') => void;
    availableSalespersons?: { id: number; name: string; email?: string; avatar?: string | null; role?: string }[];
    selectedSalespersonId?: number;
    onSalespersonChange?: (id: number) => void;
}

export function DashboardHeaderBanner({
    roleView,
    onRoleChange,
    allowedRoles = ['salesperson', 'manager', 'admin'],
    period,
    onPeriodChange,
    userName = 'Sales User',
    userRoleTitle,
    canViewAllSalesData = false,
    viewScope = 'my',
    onViewScopeChange,
    availableSalespersons = [],
    selectedSalespersonId,
    onSalespersonChange,
}: HeaderBannerProps) {
    const { t } = useTranslation();

    // Role-specific banner configurations
    const bannerConfig = {
        salesperson: {
            title: t('Salesperson Dashboard'),
            subtitle: viewScope === 'all' 
                ? t("Team aggregated pipeline, combined targets, and company sales activity")
                : t("My personal pipeline, my targets, my clients and today's actions"),
            gradient: 'from-[#1e60c8] via-[#2563eb] to-[#3b82f6]',
            icon: User,
            defaultRoleTitle: t('Sales Executive'),
        },
        manager: {
            title: t('Sales Manager Dashboard'),
            subtitle: t('My business + team performance with detailed visibility'),
            gradient: 'from-[#047857] via-[#059669] to-[#10b981]',
            icon: Users,
            defaultRoleTitle: t('Sales Manager'),
        },
        admin: {
            title: t('Sales Director / Founder Dashboard'),
            subtitle: t('My business + managers + company performance & growth'),
            gradient: 'from-[#b45309] via-[#c2410c] to-[#ea580c]',
            icon: Crown,
            defaultRoleTitle: t('Founder / Sales Director'),
        },
    };

    const currentConfig = bannerConfig[roleView] || bannerConfig.salesperson;
    const RoleIcon = currentConfig.icon;

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${currentConfig.gradient} text-white p-4 sm:p-5 shadow-lg border border-white/10 transition-all`}>
            {/* Ambient decorative glow */}
            <div className="absolute right-0 top-0 w-80 h-full bg-white/10 blur-3xl pointer-events-none transform rotate-12" />

            {/* TOP ROW: Title & Subtitle on Left, Context Filters (Scope + User + Period) on Right */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Role Icon, Title & Subtitle */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-sm">
                        <RoleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white leading-tight">
                            {currentConfig.title}
                        </h2>
                        <p className="text-xs text-white/85 font-medium mt-1 leading-snug">
                            {currentConfig.subtitle}
                        </p>
                    </div>
                </div>

                {/* Right: Data Scope Toggle, Salesperson Select & Period Filter */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
                    {/* 1. "My Data" vs "All Data" Permission Scope Toggle - only rendered if user has canViewAllSalesData */}
                    {canViewAllSalesData && (
                        <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md p-1 rounded-xl border border-white/20 shrink-0 shadow-xs">
                            <button
                                type="button"
                                onClick={() => onViewScopeChange?.('my')}
                                title={t('Switch to My Personal Data')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    viewScope === 'my'
                                        ? 'bg-white text-slate-900 shadow-sm font-bold'
                                        : 'text-white/85 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <User className="w-3.5 h-3.5" />
                                <span>{t('My Data')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onViewScopeChange?.('all')}
                                title={t('Switch to All Salespersons Data')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    viewScope === 'all'
                                        ? 'bg-white text-slate-900 shadow-sm font-bold'
                                        : 'text-white/85 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>{t('All Data')}</span>
                            </button>
                        </div>
                    )}

                    {/* Optional specific user selector when in 'my' scope and user has view-all permission */}
                    {canViewAllSalesData && viewScope === 'my' && availableSalespersons.length > 1 && (
                        <div className="shrink-0 w-36 sm:w-44">
                            <Select
                                value={String(selectedSalespersonId || '')}
                                onValueChange={(val) => onSalespersonChange?.(Number(val))}
                            >
                                <SelectTrigger className="h-8.5 text-xs bg-black/25 hover:bg-black/35 text-white border-white/20 backdrop-blur-md font-semibold cursor-pointer rounded-xl">
                                    <User className="w-3.5 h-3.5 mr-1.5 text-white/80 shrink-0" />
                                    <SelectValue placeholder={t('User')} />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xl z-50">
                                    {availableSalespersons.map((sp) => (
                                        <SelectItem key={sp.id} value={String(sp.id)}>
                                            {sp.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* 3. Period Selector */}
                    <div className="shrink-0 w-32 sm:w-36">
                        <Select value={period} onValueChange={onPeriodChange}>
                            <SelectTrigger className="h-8.5 text-xs bg-black/25 hover:bg-black/35 text-white border-white/20 backdrop-blur-md font-semibold cursor-pointer rounded-xl">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-white/80 shrink-0" />
                                <SelectValue placeholder={t('Select Period')} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xl z-50">
                                <SelectItem value="today">{t('Today')}</SelectItem>
                                <SelectItem value="this_week">{t('This Week')}</SelectItem>
                                <SelectItem value="this_month">{t('This Month')}</SelectItem>
                                <SelectItem value="this_quarter">{t('This Quarter')}</SelectItem>
                                <SelectItem value="this_year">{t('This Year')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* BOTTOM ROW: Role Switcher Toolbar (Only if user has multiple allowed roles) */}
            {allowedRoles && allowedRoles.length > 1 && (
                <div className="relative z-10 mt-3.5 pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-white/75 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {t('Dashboard View')}:
                        </span>
                        <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-xs">
                            {allowedRoles.includes('salesperson') && (
                                <button
                                    type="button"
                                    onClick={() => onRoleChange('salesperson')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        roleView === 'salesperson'
                                            ? 'bg-white text-blue-900 shadow-sm font-bold'
                                            : 'text-white/85 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {t('Salesperson')}
                                </button>
                            )}
                            {allowedRoles.includes('manager') && (
                                <button
                                    type="button"
                                    onClick={() => onRoleChange('manager')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        roleView === 'manager'
                                            ? 'bg-white text-emerald-900 shadow-sm font-bold'
                                            : 'text-white/85 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {t('Manager')}
                                </button>
                            )}
                            {allowedRoles.includes('admin') && (
                                <button
                                    type="button"
                                    onClick={() => onRoleChange('admin')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        roleView === 'admin'
                                            ? 'bg-white text-orange-950 shadow-sm font-bold'
                                            : 'text-white/85 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {t('Admin / Director')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right side info badge */}
                    <div className="text-[11px] text-white/85 font-medium hidden md:flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{userName} ({userRoleTitle || currentConfig.defaultRoleTitle})</span>
                    </div>
                </div>
            )}
        </div>
    );
}
