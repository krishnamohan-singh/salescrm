import { useState, useEffect, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { cn } from '@/lib/utils';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, Building2, User, Users, FileDown, Lock, Calendar, Banknote, Handshake, Mail, TrendingUp, PhoneCall } from 'lucide-react';
import { SendEmailModal } from '@/components/send-email-modal';
import { ChangeStageReasonModal } from '@/components/ChangeStageReasonModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import * as LucidIcons from "lucide-react";

export default function Opportunities() {
    const { t } = useTranslation();
    const { auth, opportunities, allAccounts = [], opportunityStages = [], allOpportunityStages = [], allOpportunitySources = [], allUsers = [], canViewAll = false, filters: pageFilters = {}, flash = {} } = usePage().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();
    const [selectedEmailOpportunity, setSelectedEmailOpportunity] = useState<any>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedAccount, setSelectedAccount] = useState(pageFilters.account_id || 'all');
    const [selectedStage, setSelectedStage] = useState(pageFilters.opportunity_stage_id || 'all');
    const [selectedSource, setSelectedSource] = useState(pageFilters.opportunity_source_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [selectedDatePeriod, setSelectedDatePeriod] = useState(pageFilters.date_period || 'all');
    const [selectedDateField, setSelectedDateField] = useState(pageFilters.date_field || 'created_at');
    const [showFilters, setShowFilters] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [activeView, setActiveView] = useState(
        ['list', 'grid', 'kanban'].includes(pageFilters.view) ? pageFilters.view : 'kanban'
    );
    const [kanbanData, setKanbanData] = useState<any>(null);
    const [kanbanDataRef, setKanbanDataRef] = useState<any>(null);
    const [isLoadingKanban, setIsLoadingKanban] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<any>(null);
    const isDraggingRef = useRef(false);
    const [pageInitialState, setPageInitialState] = useState(true);

    // Stage and Status Reason Modal state
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [stageModalOpportunity, setStageModalOpportunity] = useState<any>(null);
    const [stageModalTarget, setStageModalTarget] = useState<any>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusModalOpportunity, setStatusModalOpportunity] = useState<any>(null);
    const [isUpdatingStage, setIsUpdatingStage] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedStatus, selectedAccount, selectedStage, selectedSource, selectedAssignee, selectedDatePeriod, selectedDateField]);  

    const isViewingMyData = selectedAssignee === String(auth?.user?.id);

    const handleToggleMyData = () => {
        const newAssignee = isViewingMyData ? 'all' : String(auth?.user?.id);
        setSelectedAssignee(newAssignee);
    };  

    // Check if any filters are active
    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedAccount !== 'all' || selectedStage !== 'all' || selectedSource !== 'all' || selectedStatus !== 'all' || selectedAssignee !== 'all' || selectedDatePeriod !== 'all';
    };

    // Count active filters
    const activeFilterCount = () => {
        return (searchTerm ? 1 : 0) + (selectedAccount !== 'all' ? 1 : 0) + (selectedStage !== 'all' ? 1 : 0) + (selectedSource !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0) + (selectedDatePeriod !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('opportunities.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            opportunity_stage_id: selectedStage !== 'all' ? selectedStage : undefined,
            opportunity_source_id: selectedSource !== 'all' ? selectedSource : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            date_period: selectedDatePeriod !== 'all' ? selectedDatePeriod : undefined,
            date_field: selectedDatePeriod !== 'all' ? selectedDateField : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('opportunities.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            opportunity_stage_id: selectedStage !== 'all' ? selectedStage : undefined,
            opportunity_source_id: selectedSource !== 'all' ? selectedSource : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            date_period: selectedDatePeriod !== 'all' ? selectedDatePeriod : undefined,
            date_field: selectedDatePeriod !== 'all' ? selectedDateField : undefined,
            sort_field: field,
            sort_direction: direction,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const saveCurrentListUrl = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('opportunities_list_return_url', window.location.pathname + window.location.search);
        }
    };

    useEffect(() => {
        saveCurrentListUrl();
    }, [opportunities?.current_page, activeView, pageFilters]);

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'view':
                saveCurrentListUrl();
                router.get(route('opportunities.show', item.id));
                break;
            case 'edit':
                saveCurrentListUrl();
                router.get(route('opportunities.edit', item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'change-stage':
                setStageModalOpportunity(item);
                setStageModalTarget(null);
                setIsStageModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
        }
    };

    const canView = hasPermission(permissions, 'view-opportunities');

    const handleRowClick = (opportunity: any, e?: React.MouseEvent) => {
        if (!canView) return;
        saveCurrentListUrl();
        if (e && (e.metaKey || e.ctrlKey)) {
            window.open(route('opportunities.show', opportunity.id), '_blank');
            return;
        }
        router.get(route('opportunities.show', opportunity.id));
    };

    const handleAddNew = () => {
        router.get(route('opportunities.create'));
    };

    const handleAddOpportunity = (stageId: string) => {
        router.get(route('opportunities.create'), { opportunity_stage_id: stageId });
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting opportunity...'));

        router.delete(route('opportunities.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
                if (activeView === 'kanban') {
                    loadKanbanData();
                }
            },
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to delete: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleToggleStatus = (opportunity: any) => {
        if (!hasPermission(permissions, 'toggle-status-opportunities')) {
            toast.error(t('Permission denied.'));
            return;
        }
        setStatusModalOpportunity(opportunity);
        setIsStatusModalOpen(true);
    };

    const handleStatusModalConfirm = ({ reason }: { reason: string }) => {
        if (!statusModalOpportunity) return;
        const newStatus = statusModalOpportunity.status === 'active' ? 'inactive' : 'active';
        setIsUpdatingStatus(true);
        toast.loading(t('{{action}} opportunity...', { action: newStatus === 'active' ? t('Activating') : t('Deactivating') }));

        router.put(route('opportunities.toggle-status', statusModalOpportunity.id), {
            reason: reason
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.dismiss();
                toast.success(t('Opportunity status updated successfully'));
                setIsStatusModalOpen(false);
                setStatusModalOpportunity(null);
                setIsUpdatingStatus(false);
                if (activeView === 'kanban') {
                    loadKanbanData();
                }
            },
            onError: (errors) => {
                toast.dismiss();
                setIsUpdatingStatus(false);
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleStageModalConfirm = ({ newStageId, reason }: { newStageId?: string; reason: string }) => {
        if (!stageModalOpportunity) return;
        const targetStageId = newStageId || stageModalTarget?.id;
        if (!targetStageId) return;

        setIsUpdatingStage(true);
        toast.loading(t('Updating opportunity stage...'));

        router.put(route('opportunities.update-status', stageModalOpportunity.id), {
            opportunity_stage_id: targetStageId,
            reason: reason
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.dismiss();
                toast.success(t('Opportunity stage updated successfully'));
                setIsStageModalOpen(false);
                setStageModalOpportunity(null);
                setStageModalTarget(null);
                setIsUpdatingStage(false);
                if (activeView === 'kanban') {
                    loadKanbanData();
                }
            },
            onError: (errors) => {
                toast.dismiss();
                setIsUpdatingStage(false);
                toast.error(typeof errors === 'string' ? errors : t('Failed to update opportunity stage'));
            }
        });
    };

    const handleResetFilters = () => {
        router.get(route('opportunities.index'), {
            view: activeView,
           
        });
    };

    const loadKanbanData = () => {
        if (activeView !== 'kanban') return;

        setIsLoadingKanban(true);

        // Use existing opportunities data to structure kanban
        const opportunitiesData = opportunities?.data || [];
        const structuredData = {};

        allOpportunityStages.forEach(stage => {
            structuredData[stage.id] = {
                status: stage,
                items: opportunitiesData.filter(opportunity => {
                    const matchesStage = opportunity.opportunity_stage?.id === stage.id;
                    const matchesSearch = !searchTerm ||
                        opportunity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        opportunity.description?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesAccount = selectedAccount === 'all' || opportunity.account_id?.toString() === selectedAccount;
                    const matchesSource = selectedSource === 'all' || opportunity.opportunity_source_id?.toString() === selectedSource;
                    const matchesStatus = selectedStatus === 'all' || opportunity.status === selectedStatus;
                    const matchesAssignee = selectedAssignee === 'all' || opportunity.assigned_to?.toString() === selectedAssignee;

                    return matchesStage && matchesSearch && matchesAccount && matchesSource && matchesStatus && matchesAssignee;
                })
            };
        });

        setKanbanData(structuredData);
        setKanbanDataRef(structuredData);
        setIsLoadingKanban(false);
    };

    useEffect(() => {
        if (activeView === 'kanban') {
            loadKanbanData();
        }
    }, [activeView, opportunities, searchTerm, selectedAccount, selectedSource, selectedStatus, selectedAssignee]);

    // Define page actions
    const pageActions: any[] = [];

    // Add My Opportunities / All Opportunities toggle button for users with full permission
    if (canViewAll) {
        pageActions.push({
            label: '',
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: isViewingMyData ? 'default' : 'outline',
            tooltip: isViewingMyData ? t('All Opportunities') : t('My Opportunities'),
            onClick: () => handleToggleMyData(),
        });
    }

    // Add export button
    if (hasPermission(permissions, 'export-opportunities')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => window.location.href = route('opportunity.export')
        });
    }

    // Add the "Add Opportunity" button if user has permission
    if (hasPermission(permissions, 'create-opportunities')) {
        pageActions.push({
            label: t('Add Opportunity'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Opportunity Management') },
        { title: t('Opportunities') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: any, row: any) => (
                <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary transition-colors truncate">{row.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{row.account?.name || t('No account')}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'assigned_user',
            label: t('Assigned To'),
            render: (value: any) => value ? (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={value.avatar} />
                        <AvatarFallback>{getInitials(value.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{value.name}</div>
                        <div className="text-sm text-muted-foreground">{value.email}</div>
                    </div>
                </div>
            ) : <span className="text-muted-foreground">{t('Unassigned')}</span>
        },
        {
            key: 'opportunity_stage',
            label: t('Stage'),
            render: (value: any, row: any) => value ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasPermission(permissions, 'edit-opportunities')) {
                            setStageModalOpportunity(row);
                            setStageModalTarget(null);
                            setIsStageModalOpen(true);
                        }
                    }}
                    title={hasPermission(permissions, 'edit-opportunities') ? t('Click to change stage') : undefined}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-all",
                        hasPermission(permissions, 'edit-opportunities') && "cursor-pointer hover:opacity-80 hover:scale-105"
                    )}
                    style={{
                        backgroundColor: value.color ? `${value.color}18` : undefined,
                        color: value.color,
                        borderColor: value.color ? `${value.color}40` : undefined,
                    }}
                >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: value.color || '#94a3b8' }} />
                    <span>{value.name}</span>
                </button>
            ) : t('-')
        },
        {
            key: 'opportunity_source',
            label: t('Source'),
            render: (value: any) => <span>{value?.name || t('-')}</span>
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string, row: any) => (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasPermission(permissions, 'toggle-status-opportunities')) {
                            handleToggleStatus(row);
                        }
                    }}
                    title={hasPermission(permissions, 'toggle-status-opportunities') ? t('Click to toggle status') : undefined}
                    className={cn(
                        `inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                            : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                        }`,
                        hasPermission(permissions, 'toggle-status-opportunities') && "cursor-pointer hover:opacity-80 hover:scale-105 transition-all"
                    )}
                >
                    {value === 'active' ? t('Active') : t('Inactive')}
                </button>
            )
        },
        {
            key: 'close_date',
            label: t('Close Date'),
            sortable: true,
            type: 'date',
        },
        {
            key: 'last_contacted_date',
            label: t('Last Contacted'),
            sortable: true,
            render: (value: any) => {
                if (!value) {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            <PhoneCall className="h-3 w-3 text-gray-400" />
                            {t('Never')}
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <PhoneCall className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                        {window.appSettings?.formatDateTime(value, false) || new Date(value).toLocaleDateString()}
                    </span>
                );
            }
        },
        {
            key: 'created_at',
            label: t('Created At'),
            sortable: true,
            type: 'date',
        }
    ];

    // Define table actions
    const actions = [
        {
            label: t('Change Stage'),
            icon: 'TrendingUp',
            action: 'change-stage',
            className: 'text-indigo-500',
            requiredPermission: 'edit-opportunities'
        },
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-opportunities'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-opportunities'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-opportunities'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-opportunities'
        }
    ];

    return (
        <PageTemplate
            title={t("Opportunities")}
            description={t("Manage your opportunities")}
            url="/opportunities"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
            className={activeView === 'kanban' ? 'overflow-hidden' : ''}
        >
            {/* Search and filters section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'account_id',
                            label: t('Account'),
                            type: 'select',
                            searchable: true,
                            value: selectedAccount,
                            onChange: setSelectedAccount,
                            options: [
                                { value: 'all', label: t('All Accounts') },
                                ...allAccounts.map((account: any) => ({
                                    value: account.id.toString(),
                                    label: account.name
                                }))
                            ]
                        },
                        {
                            name: 'opportunity_stage_id',
                            label: t('Stage'),
                            type: 'select',
                            searchable: true,
                            value: selectedStage,
                            onChange: setSelectedStage,
                            options: [
                                { value: 'all', label: t('All Stages') },
                                ...allOpportunityStages.map((stage: any) => ({
                                    value: stage.id.toString(),
                                    label: stage.name
                                }))
                            ]
                        },
                        {
                            name: 'opportunity_source_id',
                            label: t('Source'),
                            type: 'select',
                            searchable: true,
                            value: selectedSource,
                            onChange: setSelectedSource,
                            options: [
                                { value: 'all', label: t('All Sources') },
                                ...allOpportunitySources.map((source: any) => ({
                                    value: source.id.toString(),
                                    label: source.name
                                }))
                            ]
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                                { value: 'all', label: t('All Status') },
                                { value: 'active', label: t('Active') },
                                { value: 'inactive', label: t('Inactive') }
                            ]
                        },
                        {
                            name: 'assigned_to',
                            label: t('Assigned To'),
                            type: 'select',
                            searchable: true,
                            value: selectedAssignee,
                            onChange: setSelectedAssignee,
                            options: [
                                { value: 'all', label: t('All Users') },
                                ...allUsers.map((user: any) => ({
                                    value: user.id.toString(),
                                    label: user.name
                                }))
                            ]
                        },
                        {
                            name: 'date_period',
                            label: t('Period'),
                            type: 'select' as const,
                            value: selectedDatePeriod,
                            onChange: setSelectedDatePeriod,
                            options: [
                                { value: 'all', label: t('All Time') },
                                { value: 'today', label: t('Today') },
                                { value: 'yesterday', label: t('Yesterday') },
                                { value: 'this_week', label: t('This Week') },
                                { value: 'last_week', label: t('Last Week') },
                                { value: 'this_month', label: t('This Month') },
                                { value: 'last_month', label: t('Last Month') },
                                { value: 'this_year', label: t('This Year') },
                                { value: 'last_year', label: t('Last Year') },
                                { value: 'never_contacted', label: t('Never Contacted') },
                            ]
                        },
                        {
                            name: 'date_field',
                            label: t('Filter Date By'),
                            type: 'select' as const,
                            value: selectedDateField,
                            onChange: setSelectedDateField,
                            options: [
                                { value: 'created_at', label: t('Created Date') },
                                { value: 'last_contacted_date', label: t('Last Contacted Date') },
                            ]
                        }
                    ]}
                    // showFilters={showFilters}
                    // setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    // onApplyFilters={applyFilters}
                    // {...(activeView !== 'kanban' && {
                    //     currentPerPage: pageFilters.per_page?.toString() || "10",
                    //     onPerPageChange: (value) => {
                    //         router.get(route('opportunities.index'), {
                    //             view: activeView,
                    //             page: 1,
                    //             search: searchTerm || undefined,
                    //             account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                    //             opportunity_stage_id: selectedStage !== 'all' ? selectedStage : undefined,
                    //             opportunity_source_id: selectedSource !== 'all' ? selectedSource : undefined,
                    //             status: selectedStatus !== 'all' ? selectedStatus : undefined,
                    //             assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                    //             sort_field: pageFilters.sort_field || undefined,
                    //             sort_direction: pageFilters.sort_direction || undefined,
                    //             ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                    //         }, { preserveState: true, preserveScroll: true });
                    //     }
                    // })}
                    showViewToggle={true}
                    activeView={activeView}
                    onViewChange={(view) => {
                        setActiveView(view);
                        router.get(route('opportunities.index'), {
                            view,
                            page: pageFilters.page || undefined,
                            search: searchTerm || undefined,
                            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                            opportunity_stage_id: selectedStage !== 'all' ? selectedStage : undefined,
                            opportunity_source_id: selectedSource !== 'all' ? selectedSource : undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                            date_period: selectedDatePeriod !== 'all' ? selectedDatePeriod : undefined,
                            date_field: selectedDatePeriod !== 'all' ? selectedDateField : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
                        }, { preserveState: true, preserveScroll: true });
                    }}
                    viewOptions={[
                        { value: 'list', label: t('List View'), icon: 'List' },
                        { value: 'kanban', label: t('Kanban View'), icon: 'Columns' },
                        // { value: 'grid', label: t('Grid View'), icon: 'Grid3X3' }
                    ]}
                />
            </div>

            {/* Content section */}
            {activeView === 'list' ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={opportunities?.data || []}
                        from={opportunities?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                        entityPermissions={{
                            view: 'view-opportunities',
                            create: 'create-opportunities',
                            edit: 'edit-opportunities',
                            delete: 'delete-opportunities'
                        }}
                        onRowClick={canView ? handleRowClick : undefined}
                    />

                    {/* Pagination section */}
                    <Pagination
                        from={opportunities?.from || 1}
                        to={opportunities?.to || opportunities?.data?.length || 0}
                        total={opportunities?.total || opportunities?.data?.length || 0}
                        links={opportunities?.links}
                        entityName={t("opportunities")}
                        onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                        {...(activeView !== 'kanban' && {
                        currentPerPage: pageFilters.per_page?.toString() || "10",
                        onPerPageChange: (value) => {
                            router.get(route('opportunities.index'), {
                                view: activeView,
                                page: 1,
                                search: searchTerm || undefined,
                                account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                                opportunity_stage_id: selectedStage !== 'all' ? selectedStage : undefined,
                                opportunity_source_id: selectedSource !== 'all' ? selectedSource : undefined,
                                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                                date_period: selectedDatePeriod !== 'all' ? selectedDatePeriod : undefined,
                                date_field: selectedDatePeriod !== 'all' ? selectedDateField : undefined,
                                sort_field: pageFilters.sort_field || undefined,
                                sort_direction: pageFilters.sort_direction || undefined,
                                ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            }, { preserveState: true, preserveScroll: true });
                        }
                    })}
                    />
                </div>
            ) : activeView === 'kanban' ? (
                <>
                    <style>{`
                        .kanban-col-scroll::-webkit-scrollbar { width: 4px; }
                        .kanban-col-scroll::-webkit-scrollbar-track { background: transparent; }
                        .kanban-col-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                        .kanban-board-scroll::-webkit-scrollbar { height: 6px; }
                        .kanban-board-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
                        .kanban-board-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    `}</style>
                    <div className="flex gap-4 overflow-x-auto pb-2 kanban-board-scroll" style={{ height: 'calc(100vh - 240px)' }}>
                        {isLoadingKanban ? (
                            <div className="flex items-center justify-center w-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : opportunityStages.map((stage: any) => {
                            const stageOpportunities = Object.values(kanbanData || {}).find((column: any) => column.status?.id === stage.id)?.items || [];
                            const colBg = stage.color ? `${stage.color}12` : '#f8fafc';
                            const colBorder = stage.color ? `${stage.color}30` : '#e2e8f0';
                            return (
                                <div
                                    key={stage.id}
                                    className="flex-shrink-0 flex flex-col rounded-xl border"
                                    style={{ width: '300px', minWidth: '300px', backgroundColor: dragOverStage === stage.id ? (stage.color ? `${stage.color}22` : '#e2e8f0') : colBg, borderColor: dragOverStage === stage.id ? (stage.color || '#94a3b8') : colBorder, height: '100%', transition: 'background-color 0.15s, border-color 0.15s' }}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragOverStage(null);
                                        setDraggingId(null);
                                        const opportunityId = e.dataTransfer.getData('opportunityId');
                                        if (!opportunityId) return;
                                        if (!hasPermission(permissions, 'edit-opportunities')) { toast.error(t('Permission denied.')); return; }
                                        const allItems = Object.values(kanbanData).flatMap((c: any) => c.items);
                                        const currentOpportunity = allItems.find((o: any) => o.id.toString() === opportunityId);
                                        if (!currentOpportunity) return;
                                        if (currentOpportunity.opportunity_stage?.id === stage.id || currentOpportunity.opportunity_stage_id === stage.id) return;
                                        
                                        setStageModalOpportunity(currentOpportunity);
                                        setStageModalTarget(stage);
                                        setIsStageModalOpen(true);
                                    }}
                                >
                                    {/* Column header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colBorder }}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }}></span>
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{stage.name}</span>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: stage.color + '22', color: stage.color }}>
                                                {stageOpportunities.length}
                                            </span>
                                        </div>
                                        {hasPermission(permissions, 'create-opportunities') && (
                                            <button
                                                onClick={() => handleAddOpportunity(stage.id.toString())}
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/60 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                                title={t('Add Opportunity')}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Cards */}
                                    <div className="flex-1 overflow-y-auto kanban-col-scroll p-3 space-y-3">
                                        {stageOpportunities.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                                                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
                                                    <Building2 className="h-6 w-6 text-gray-300" />
                                                </div>
                                                <p className="text-xs text-gray-400">{t('Drop opportunities here')}</p>
                                            </div>
                                        ) : stageOpportunities.map((opportunity: any) => (
                                            <div
                                                key={opportunity.id}
                                                draggable={hasPermission(permissions, 'edit-opportunities')}
                                                onDragStart={(e) => {
                                                    if (!hasPermission(permissions, 'edit-opportunities')) { e.preventDefault(); return; }
                                                    isDraggingRef.current = true;
                                                    e.dataTransfer.setData('opportunityId', opportunity.id.toString());
                                                    setDraggingId(opportunity.id.toString());
                                                }}
                                                onDragEnd={() => {
                                                    setDraggingId(null);
                                                    setDragOverStage(null);
                                                    setTimeout(() => { isDraggingRef.current = false; }, 150);
                                                }}
                                                className={hasPermission(permissions, 'edit-opportunities') ? 'cursor-grab active:cursor-grabbing' : ''}
                                                style={{ opacity: draggingId === opportunity.id.toString() ? 0.4 : 1, transition: 'opacity 0.15s' }}
                                            >
                                                <div
                                                    className={cn(
                                                        "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200",
                                                        canView && "cursor-pointer"
                                                    )}
                                                    onClick={(e) => {
                                                        if (isDraggingRef.current) return;
                                                        const target = e.target as HTMLElement;
                                                        if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                                            return;
                                                        }
                                                        const selection = window.getSelection();
                                                        if (selection && selection.toString().trim().length > 0) {
                                                            return;
                                                        }
                                                        handleRowClick(opportunity, e);
                                                    }}
                                                >
                                                    <div className="p-3">
                                                        {/* Top row: avatar + name/account + menu */}
                                                        <div className="flex items-start gap-2.5 mb-2.5">
                                                            {/* <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-primary bg-primary/15 ring-1 ring-primary text-xs font-bold">
                                                                {getInitials(opportunity.name)}
                                                            </div> */}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight truncate hover:text-primary transition-colors">
                                                                    {opportunity.name}
                                                                </h4>
                                                            </div>
                                                            {(hasPermission(permissions, 'view-opportunities') || hasPermission(permissions, 'edit-opportunities') || hasPermission(permissions, 'delete-opportunities')) && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 flex-shrink-0 text-gray-400 hover:text-gray-600"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-40">
                                                                        {hasPermission(permissions, 'view-opportunities') && (
                                                                            <DropdownMenuItem onClick={() => handleAction('view', opportunity)}>
                                                                                <Eye className="h-4 w-4 mr-2" />{t('View')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPermission(permissions, 'edit-opportunities') && (
                                                                            <DropdownMenuItem onClick={() => handleAction('edit', opportunity)}>
                                                                                <Edit className="h-4 w-4 mr-2" />{t('Edit')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPermission(permissions, 'edit-opportunities') && (
                                                                            <DropdownMenuItem onClick={() => { setStageModalOpportunity(opportunity); setStageModalTarget(null); setIsStageModalOpen(true); }}>
                                                                                <TrendingUp className="h-4 w-4 mr-2 text-indigo-500" />{t('Change Stage')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {(opportunity.contact?.email || opportunity.account?.email) && (
                                                                            <DropdownMenuItem onClick={() => { setSelectedEmailOpportunity(opportunity); setIsEmailModalOpen(true); }}>
                                                                                <Mail className="h-4 w-4 mr-2 text-primary" />{t('Send Email')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPermission(permissions, 'delete-opportunities') && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => handleAction('delete', opportunity)} className="text-red-600">
                                                                                    <Trash2 className="h-4 w-4 mr-2" />{t('Delete')}
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>

                                                        {/* Account */}
                                                        {opportunity.account?.name && (
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                                <span className="text-xs text-gray-500 truncate">{opportunity.account.name}</span>
                                                            </div>
                                                        )}

                                                        {/* Contact */}
                                                        {opportunity.contact?.name && (
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                                <span className="text-xs text-gray-500 truncate">{opportunity.contact.name}</span>
                                                            </div>
                                                        )}

                                                        {/* Amount + Source in one line */}
                                                        {(opportunity.amount || opportunity.opportunity_source) && (
                                                            <div className="flex items-center gap-2 mb-3">
                                                                {opportunity.amount && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Banknote className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                                        <span className="text-xs font-mono text-gray-500">{window.appSettings?.formatCurrency(parseFloat(opportunity.amount)) || `$${parseFloat(opportunity.amount).toFixed(2)}`}</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {opportunity.opportunity_source && (
                                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-gray-600/20">
                                                                        {opportunity.opportunity_source.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Stage change reason */}
                                                        {opportunity.stage_change_reason && (
                                                            <div className="mb-2 px-2 py-1 rounded bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200" title={opportunity.stage_change_reason}>
                                                                <span className="font-semibold text-amber-800 dark:text-amber-300 mr-1">{t('Reason')}:</span>
                                                                <span className="line-clamp-2">{opportunity.stage_change_reason}</span>
                                                            </div>
                                                        )}

                                                        {/* Footer: date + assigned avatar */}
                                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                                            <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    <span>
                                                                        {window.appSettings?.formatDateTime(opportunity.close_date || opportunity.created_at, false) || new Date(opportunity.close_date || opportunity.created_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <span
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
                                                                        opportunity.last_contacted_date
                                                                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
                                                                            : "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                                                                    )}
                                                                    title={t('Last Contacted')}
                                                                >
                                                                    <PhoneCall className="h-2.5 w-2.5" />
                                                                    {opportunity.last_contacted_date
                                                                        ? (window.appSettings?.formatDateTime(opportunity.last_contacted_date, false) || new Date(opportunity.last_contacted_date).toLocaleDateString())
                                                                        : t('Never')}
                                                                </span>
                                                            </div>
                                                            {opportunity.assigned_user ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Avatar className="h-7 w-7 cursor-pointer">
                                                                                <AvatarImage src={opportunity.assigned_user.avatar} />
                                                                                <AvatarFallback className="text-xs" style={{ backgroundColor: stage.color + '33', color: stage.color }}>
                                                                                    {getInitials(opportunity.assigned_user.name)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{opportunity.assigned_user.name}</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ) : (
                                                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                                    <User className="h-3 w-3 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div>
                    {/* Grid View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {opportunities?.data?.map((opportunity: any) => (
                            <Card
                                key={opportunity.id}
                                className={cn(
                                    "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow",
                                    canView && "cursor-pointer"
                                )}
                                onClick={(e) => {
                                    if (!canView) return;
                                    const target = e.target as HTMLElement;
                                    if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                        return;
                                    }
                                    const selection = window.getSelection();
                                    if (selection && selection.toString().trim().length > 0) {
                                        return;
                                    }
                                    handleAction('view', opportunity);
                                }}
                            >
                                <div className="p-6 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start space-x-4">
                                            <div className="h-16 w-16 rounded-full bg-primary/15 text-primary ring-1 ring-primary flex items-center justify-center text-lg font-bold flex-shrink-0">
                                                {getInitials(opportunity.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3
                                                    className={cn(
                                                        "text-lg font-bold text-gray-900 dark:text-white mb-2",
                                                        canView && "cursor-pointer hover:text-primary transition-colors"
                                                    )}
                                                    onClick={() => canView && handleAction('view', opportunity)}
                                                >
                                                    {opportunity.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{opportunity.account?.name || t('No account')}</p>
                                                <div className="flex items-center">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${opportunity.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                                        {opportunity.status === 'active' ? t('Active') : t('Inactive')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 flex-shrink-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
                                                {hasPermission(permissions, 'view-opportunities') && (
                                                    <DropdownMenuItem onClick={() => handleAction('view', opportunity)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        <span>{t("View Opportunity")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'toggle-status-opportunities') && (
                                                    <DropdownMenuItem onClick={() => handleAction('toggle-status', opportunity)}>
                                                        <Lock className='h-4 w-4 mr-2' />
                                                        <span>{opportunity.status === 'active' ? t("Deactivate") : t("Activate")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                {hasPermission(permissions, 'edit-opportunities') && (
                                                    <DropdownMenuItem onClick={() => handleAction('edit', opportunity)} className="text-amber-600">
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        <span>{t("Edit")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'delete-opportunities') && (
                                                    <DropdownMenuItem onClick={() => handleAction('delete', opportunity)} className="text-rose-600">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        <span>{t("Delete")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Opportunity info */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-4 flex-1">
                                        <div className="mb-2">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {t('Amount')}: <span className="font-mono">{opportunity.amount ? (window.appSettings?.formatCurrency(parseFloat(opportunity.amount)) || `$${parseFloat(opportunity.amount).toFixed(2)}`) : t('-')}</span>
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-500" />

                                                <span>
                                                    {t('Close Date')}:{" "}
                                                    {(opportunity.close_date || opportunity.created_at)
                                                        ? (window.appSettings?.formatDateTime(
                                                            opportunity.close_date || opportunity.created_at,
                                                            false
                                                        ) || new Date(opportunity.close_date || opportunity.created_at).toLocaleDateString())
                                                        : t('-')}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {opportunity.opportunity_stage && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset" style={{
                                                    backgroundColor: `${opportunity.opportunity_stage.color}20`,
                                                    color: opportunity.opportunity_stage.color,
                                                    borderColor: `${opportunity.opportunity_stage.color}40`
                                                }}>
                                                    {opportunity.opportunity_stage.name}
                                                </span>
                                            )}
                                            {opportunity.opportunity_source && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-purple-50 text-purple-700 ring-green-600/20">
                                                    {opportunity.opportunity_source.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Created date */}
                                   <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
    <Calendar className="h-4 w-4 text-gray-500" />

    <span>
        {t("Created:")}{" "}
        {window.appSettings?.formatDateTime(opportunity.created_at, false) ||
            new Date(opportunity.created_at).toLocaleDateString()}
    </span>
</div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 mt-auto">
                                        {hasPermission(permissions, 'edit-opportunities') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('edit', opportunity)}
                                                className="flex-1 h-9 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Edit className="h-4 w-4 mr-2 text-gray-500" />
                                                {t("Edit")}
                                            </Button>
                                        )}

                                        {hasPermission(permissions, 'view-opportunities') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('view', opportunity)}
                                                className="flex-1 h-9 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Eye className="h-4 w-4 mr-2 text-gray-500" />
                                                {t("View")}
                                            </Button>
                                        )}

                                        {hasPermission(permissions, 'delete-opportunities') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('delete', opportunity)}
                                                className="flex-1 h-9 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2 text-gray-500" />
                                                {t("Delete")}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination for grid view */}
                    <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                        <Pagination
                            from={opportunities?.from || 1}
                            to={opportunities?.to || opportunities?.data?.length || 0}
                            total={opportunities?.total || opportunities?.data?.length || 0}
                            links={opportunities?.links}
                            entityName={t("opportunities")}
                            onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                            perPageOptions={[12, 24, 48, 96]}
                            currentPerPage={pageFilters.per_page?.toString() || '12'}
                            onPerPageChange={(value) => {
                                router.get(route('opportunities.index'), {
                                    view: activeView, page: 1,
                                    search: searchTerm || undefined,
                                    account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                                    opportunity_stage_id: selectedStage !== 'all' ? selectedStage : undefined,
                                    opportunity_source_id: selectedSource !== 'all' ? selectedSource : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                    assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                                    sort_field: pageFilters.sort_field || undefined,
                                    sort_direction: pageFilters.sort_direction || undefined,
                                    ...(parseInt(value) !== 12 && { per_page: parseInt(value) }),
                                }, { preserveState: true, preserveScroll: true });
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('opportunity')}
            />

            {/* Send Email Modal */}
            {selectedEmailOpportunity && (
                <SendEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => { setIsEmailModalOpen(false); setSelectedEmailOpportunity(null); }}
                    recipientEmail={selectedEmailOpportunity.contact?.email || selectedEmailOpportunity.account?.email || ''}
                    recipientName={selectedEmailOpportunity.contact?.name || selectedEmailOpportunity.account?.name || selectedEmailOpportunity.name}
                    entityType="opportunity"
                    entityId={selectedEmailOpportunity.id}
                    entityName={selectedEmailOpportunity.name}
                />
            )}

            {/* Stage Change Reason Modal */}
            <ChangeStageReasonModal
                isOpen={isStageModalOpen}
                onClose={() => {
                    setIsStageModalOpen(false);
                    setStageModalOpportunity(null);
                    setStageModalTarget(null);
                }}
                onConfirm={handleStageModalConfirm}
                itemName={stageModalOpportunity?.name || ''}
                entityType="opportunity"
                currentStage={stageModalOpportunity ? {
                    id: stageModalOpportunity.opportunity_stage?.id || stageModalOpportunity.opportunity_stage_id,
                    name: stageModalOpportunity.opportunity_stage?.name || opportunityStages.find((s: any) => s.id === stageModalOpportunity.opportunity_stage_id)?.name || 'Current Stage',
                    color: stageModalOpportunity.opportunity_stage?.color || opportunityStages.find((s: any) => s.id === stageModalOpportunity.opportunity_stage_id)?.color
                } : null}
                targetStage={stageModalTarget}
                stages={opportunityStages}
                isLoading={isUpdatingStage}
            />

            {/* Status Toggle Reason Modal */}
            <ChangeStageReasonModal
                isOpen={isStatusModalOpen}
                onClose={() => {
                    setIsStatusModalOpen(false);
                    setStatusModalOpportunity(null);
                }}
                onConfirm={handleStatusModalConfirm}
                itemName={statusModalOpportunity?.name || ''}
                entityType="opportunity"
                isStatusToggle={true}
                currentStatus={statusModalOpportunity?.status || 'active'}
                isLoading={isUpdatingStatus}
            />
        </PageTemplate>
    );
}
