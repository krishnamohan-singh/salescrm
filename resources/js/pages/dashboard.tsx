import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { RefreshCw, User, Users, Crown, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePage, router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import {
    DashboardHeaderBanner,
    SalespersonDashboardView,
    SalesManagerDashboardView,
    AdminFounderDashboardView,
} from '@/components/dashboard';

export default function Dashboard({
    dashboardData,
    canViewAll = false,
    filters = {},
}: {
    dashboardData: any;
    canViewAll?: boolean;
    filters?: any;
}) {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCheckedIn, setIsCheckedIn] = useState<boolean>(
        Boolean(dashboardData?.attendance?.isCheckedIn)
    );
    const [period, setPeriod] = useState(dashboardData?.period || 'this_month');
    const [isPunching, setIsPunching] = useState(false);

    // Permission and View Scope States
    const canViewAllSalesData = Boolean(dashboardData?.canViewAllSalesData ?? canViewAll);
    const [viewScope, setViewScope] = useState<'my' | 'all'>(
        filters?.view_scope && ['my', 'all'].includes(filters.view_scope)
            ? filters.view_scope
            : (dashboardData?.viewScope || 'my')
    );
    const [selectedSalespersonId, setSelectedSalespersonId] = useState<number | undefined>(
        filters?.assigned_to ? Number(filters.assigned_to) : dashboardData?.selectedSalespersonId
    );

    // Allowed roles passed from server permission check
    const allowedRoles: ('salesperson' | 'manager' | 'admin')[] = 
        dashboardData?.allowedRoles || ['salesperson', 'manager', 'admin'];

    // Role state: 'salesperson' | 'manager' | 'admin'
    const initialRole =
        filters?.role_view && allowedRoles.includes(filters.role_view)
            ? filters.role_view
            : (dashboardData?.activeRole && allowedRoles.includes(dashboardData.activeRole)
                ? dashboardData.activeRole
                : allowedRoles[0]);

    const [roleView, setRoleView] = useState<'salesperson' | 'manager' | 'admin'>(initialRole);

    useEffect(() => {
        if (dashboardData?.attendance?.isCheckedIn !== undefined) {
            setIsCheckedIn(Boolean(dashboardData.attendance.isCheckedIn));
        }
        if (dashboardData?.activeRole && allowedRoles.includes(dashboardData.activeRole)) {
            setRoleView(dashboardData.activeRole);
        } else if (filters?.role_view && allowedRoles.includes(filters.role_view)) {
            setRoleView(filters.role_view);
        }
        if (dashboardData?.period) {
            setPeriod(dashboardData.period);
        } else if (filters?.period) {
            setPeriod(filters.period);
        }
        if (dashboardData?.viewScope) {
            setViewScope(dashboardData.viewScope);
        } else if (filters?.view_scope) {
            setViewScope(filters.view_scope);
        }
        if (dashboardData?.selectedSalespersonId !== undefined) {
            setSelectedSalespersonId(dashboardData.selectedSalespersonId);
        } else if (filters?.assigned_to) {
            setSelectedSalespersonId(Number(filters.assigned_to));
        }
    }, [dashboardData, filters]);

    const handleRoleChange = (newRole: 'salesperson' | 'manager' | 'admin') => {
        if (!allowedRoles.includes(newRole)) return;
        setRoleView(newRole);
        const dashboardUrl = typeof route !== 'undefined' ? route('dashboard') : '/dashboard';
        router.get(
            dashboardUrl,
            {
                role_view: newRole,
                period: period,
                view_scope: viewScope,
                assigned_to: selectedSalespersonId,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handlePeriodChange = (newPeriod: string) => {
        setPeriod(newPeriod);
        const dashboardUrl = typeof route !== 'undefined' ? route('dashboard') : '/dashboard';
        router.get(
            dashboardUrl,
            {
                role_view: roleView,
                period: newPeriod,
                view_scope: viewScope,
                assigned_to: selectedSalespersonId,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleViewScopeChange = (newScope: 'my' | 'all') => {
        if (!canViewAllSalesData && newScope === 'all') {
            toast.error(t('You do not have permission to view all sales data.'));
            return;
        }
        setViewScope(newScope);
        const dashboardUrl = typeof route !== 'undefined' ? route('dashboard') : '/dashboard';
        router.get(
            dashboardUrl,
            {
                role_view: roleView,
                period: period,
                view_scope: newScope,
                assigned_to: newScope === 'all' ? undefined : selectedSalespersonId,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleSalespersonChange = (newUserId: number) => {
        if (!canViewAllSalesData) return;
        setSelectedSalespersonId(newUserId);
        setViewScope('my');
        const dashboardUrl = typeof route !== 'undefined' ? route('dashboard') : '/dashboard';
        router.get(
            dashboardUrl,
            {
                role_view: roleView,
                period: period,
                view_scope: 'my',
                assigned_to: newUserId,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleToggleCheckInOut = () => {
        setIsPunching(true);
        if (!isCheckedIn) {
            router.post(
                route('attendance.check-in'),
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setIsCheckedIn(true);
                        toast.success(t('Checked in successfully!'));
                    },
                    onError: () => toast.error(t('Failed to check in.')),
                    onFinish: () => setIsPunching(false),
                }
            );
        } else {
            router.post(
                route('attendance.check-out'),
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setIsCheckedIn(false);
                        toast.success(t('Checked out successfully!'));
                    },
                    onError: () => toast.error(t('Failed to check out.')),
                    onFinish: () => setIsPunching(false),
                }
            );
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        const dashboardUrl = typeof route !== 'undefined' ? route('dashboard') : '/dashboard';
        router.get(
            dashboardUrl,
            {
                ...filters,
                role_view: roleView,
                period: period,
                view_scope: viewScope,
                assigned_to: selectedSalespersonId,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const pageActions = [
        {
            label: t('Refresh'),
            icon: <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />,
            variant: 'outline' as const,
            onClick: handleRefresh,
        },
    ];

    // Current profile data
    const userProfile = {
        ...dashboardData?.userProfile,
        name: dashboardData?.userProfile?.name || auth?.user?.name,
        email: dashboardData?.userProfile?.email || auth?.user?.email,
        avatar: dashboardData?.userProfile?.avatar || auth?.user?.avatar,
        roleTitle: dashboardData?.userProfile?.roleTitle,
    };

    return (
        <PageTemplate
            title={t('Dashboard')}
            description={t('Multi-role performance tracking, sales pipeline, and company insights.')}
            url={typeof route !== 'undefined' ? route('dashboard') : '/dashboard'}
            actions={pageActions}
        >
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .dash-anim { animation: fadeSlideUp 0.4s ease-out both; }
            `}</style>

            <div className="space-y-6 dash-anim">
                
                {/* Role Header Banner with Scope Toggle, Role Switcher & Period Selector */}
                <DashboardHeaderBanner
                    roleView={roleView}
                    onRoleChange={handleRoleChange}
                    allowedRoles={allowedRoles}
                    period={period}
                    onPeriodChange={handlePeriodChange}
                    userName={userProfile?.name}
                    userRoleTitle={userProfile?.roleTitle}
                    canViewAllSalesData={canViewAllSalesData}
                    viewScope={viewScope}
                    onViewScopeChange={handleViewScopeChange}
                    availableSalespersons={dashboardData?.availableSalespersons || []}
                    selectedSalespersonId={selectedSalespersonId}
                    onSalespersonChange={handleSalespersonChange}
                />

                {/* Conditional Rendering based on selected Role View */}
                {roleView === 'salesperson' && (
                    <SalespersonDashboardView
                        data={dashboardData?.salesperson}
                        attendance={dashboardData?.attendance}
                        userProfile={userProfile}
                        period={period}
                        isCheckedIn={isCheckedIn}
                        onToggleCheckInOut={handleToggleCheckInOut}
                        viewScope={viewScope}
                        canViewAllSalesData={canViewAllSalesData}
                    />
                )}

                {roleView === 'manager' && (
                    <SalesManagerDashboardView
                        data={dashboardData?.manager}
                        attendance={dashboardData?.attendance}
                        userProfile={userProfile}
                        period={period}
                        isCheckedIn={isCheckedIn}
                        onToggleCheckInOut={handleToggleCheckInOut}
                    />
                )}

                {roleView === 'admin' && (
                    <AdminFounderDashboardView
                        data={dashboardData?.admin}
                        attendance={dashboardData?.attendance}
                        userProfile={userProfile}
                        period={period}
                        isCheckedIn={isCheckedIn}
                        onToggleCheckInOut={handleToggleCheckInOut}
                    />
                )}

            </div>
        </PageTemplate>
    );
}
