import React, { useState, useEffect, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, Building2, User, Users, Download, Upload, FileUp, FileDown, Lock, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { ImportModal } from '@/components/ImportModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import * as LucidIcons from "lucide-react";
import UserInitials from '@/components/user-initials';


export default function Leads() {
    const { t } = useTranslation();
    const { auth, leads, leadStatuses = [], allLeadStatuses = [], leadSources = [], allLeadSources = [], accounts = [], campaigns = [], accountIndustries = [], accountTypes = [], users = [], allUsers = [], canViewAll = false, samplePath, filters: pageFilters = {}, kanbanData: initialKanbanData, flash = {} } = usePage().props as any;

    useEffect(() => {
        if (importingRef.current) { importingRef.current = false; return; }
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedLeadStatus, setSelectedLeadStatus] = useState(pageFilters.lead_status_id || 'all');
    const [selectedLeadSource, setSelectedLeadSource] = useState(pageFilters.lead_source_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedConverted, setSelectedConverted] = useState(pageFilters.is_converted || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const importingRef = useRef(false);
    const [convertType, setConvertType] = useState<'account' | 'contact'>('account');
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [activeView, setActiveView] = useState(
        ['list', 'grid', 'kanban'].includes(pageFilters.view) ? pageFilters.view : 'kanban'
    );
    const [kanbanData, setKanbanData] = useState<any>(null);
    const [kanbanDataRef, setKanbanDataRef] = useState<any>(null);
    const [isLoadingKanban, setIsLoadingKanban] = useState(false);
    const [pageInitialState, setPageInitialState] = useState(true);
    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedStatus, selectedConverted, selectedAssignee, selectedLeadStatus, selectedLeadSource]);

    const isViewingMyData = selectedAssignee === String(auth?.user?.id);

    const handleToggleMyData = () => {
        const newAssignee = isViewingMyData ? 'all' : String(auth?.user?.id);
        setSelectedAssignee(newAssignee);
    };


    // Check if any filters are active
    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedLeadStatus !== 'all' || selectedLeadSource !== 'all' || selectedStatus !== 'all' || selectedConverted !== 'all' || selectedAssignee !== 'all';
    };

    const hasEmptyDropdowns = leadStatuses.length === 0 || leadSources.length === 0 || accountIndustries.length === 0 || campaigns.length === 0 || users.length === 0;

    // Count active filters
    const activeFilterCount = () => {
        return (searchTerm ? 1 : 0) + (selectedLeadStatus !== 'all' ? 1 : 0) + (selectedLeadSource !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedConverted !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('leads.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            lead_status_id: selectedLeadStatus !== 'all' ? selectedLeadStatus : undefined,
            lead_source_id: selectedLeadSource !== 'all' ? selectedLeadSource : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            is_converted: selectedConverted !== 'all' ? selectedConverted : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== (activeView === 'grid' ? 12 : 10) && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleExport = () => {
        (CrudFormModal as any).handleExport?.();
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('leads.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            lead_status_id: selectedLeadStatus !== 'all' ? selectedLeadStatus : undefined,
            lead_source_id: selectedLeadSource !== 'all' ? selectedLeadSource : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            is_converted: selectedConverted !== 'all' ? selectedConverted : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: field,
            sort_direction: direction,
            ...(parseInt(pageFilters.per_page) !== (activeView === 'grid' ? 12 : 10) && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'view':
                router.get(route('leads.show', item.id));
                break;
            case 'edit':
                router.get(route('leads.edit', item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
            case 'convert-to-account':
                setConvertType('account');
                setIsConvertModalOpen(true);
                break;
            case 'convert-to-contact':
                setConvertType('contact');
                setIsConvertModalOpen(true);
                break;
        }
    };

    const handleAddNew = () => {
        router.get(route('leads.create'));
    };

    const handleAddLead = (statusId: string) => {
        router.get(route('leads.create'), { lead_status_id: statusId });
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting lead...'));

        router.delete(route('leads.destroy', currentItem.id), {
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

    const handleToggleStatus = (lead: any) => {
        if (!hasPermission(permissions, 'toggle-status-leads')) {
            toast.error(t('Permission denied.'));
            return;
        }

        const newStatus = lead.status === 'active' ? 'inactive' : 'active';
        toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} lead...`);

        router.put(route('leads.toggle-status', lead.id), {}, {
            onSuccess: () => {
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
                    toast.error(t('Failed to update status: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleConvertSubmit = (formData: any) => {
        const route_name = convertType === 'account' ? 'leads.convert-to-account' : 'leads.convert-to-contact';
        toast.loading(t(`Converting lead to ${convertType}...`));

        router.put(route(route_name, currentItem.id), formData, {
            // router.post(route(route_name, currentItem.id), formData, {
            onSuccess: (page) => {
                setIsConvertModalOpen(false);
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
                    toast.error(t('Failed to convert: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleResetFilters = () => {
        router.get(route('leads.index'), {
            view: activeView,
        });

    };

    const loadKanbanData = () => {
        if (activeView !== 'kanban' || leadStatuses.length === 0) return;

        setIsLoadingKanban(true);

        // Use existing leads data to structure kanban
        const leadsData = leads?.data || [];
        const structuredData = {};

        leadStatuses.forEach(status => {
            structuredData[status.id] = {
                status: status,
                items: leadsData.filter(lead => {
                    const matchesStatus = lead.lead_status?.id === status.id;
                    const matchesSearch = !searchTerm ||
                        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesSource = selectedLeadSource === 'all' || lead.lead_source_id?.toString() === selectedLeadSource;
                    const matchesActiveStatus = selectedStatus === 'all' || lead.status === selectedStatus;
                    const matchesConverted = selectedConverted === 'all' ||
                        (selectedConverted === '1' && lead.is_converted) ||
                        (selectedConverted === '0' && !lead.is_converted);

                    return matchesStatus && matchesSearch && matchesSource && matchesActiveStatus && matchesConverted;
                })
            };
        });

        setKanbanData(structuredData);
        setKanbanDataRef(structuredData);
        setIsLoadingKanban(false);
    };

    useEffect(() => {
        if (activeView === 'kanban' && leadStatuses.length > 0) {
            loadKanbanData();
        }
    }, [activeView, leads, searchTerm, selectedLeadSource, selectedStatus, selectedConverted, leadStatuses]);

    // Define page actions
    const pageActions: any[] = [];

    // Add My Leads / All Leads toggle button for users with full permission
    if (canViewAll) {
        pageActions.push({
            label: '',
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: isViewingMyData ? 'default' : 'outline',
            tooltip: isViewingMyData ? t('All Leads') : t('My Leads'),
            onClick: () => handleToggleMyData(),
        });
    }

    // Add export button
    if (hasPermission(permissions, 'export-leads')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => handleExport()
        });
    }

    // Add import button
    if (hasPermission(permissions, 'import-leads')) {
        pageActions.push({
            label: t('Import'),
            icon: <FileUp className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => setIsImportModalOpen(true)
        });
    }

    // Add the "Add Lead" button if user has permission
    if (hasPermission(permissions, 'create-leads')) {
        pageActions.push({
            label: t('Add Lead'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew(),
            disabled: hasEmptyDropdowns
        });
    }
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Lead Management') },
        { title: t('Leads') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: any, row: any) => {
                return (
                    <div className="flex items-center gap-3">
                        <UserInitials name={row.name} />
                        <div>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-sm text-muted-foreground">{row.email || t('No email')}</div>
                        </div>
                    </div>
                );
            }
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
            key: 'value',
            label: t('Value'),
            sortable: true,
            render: (value: any) => value ? <span className="font-mono">{window.appSettings?.formatCurrency(parseFloat(value)) || `$${parseFloat(value).toFixed(2)}`}</span> : t('-')
        },
        {
            key: 'lead_status',
            label: t('Progress'),
            render: (value: any) => value ? (
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset" style={{ backgroundColor: value.color + '20', color: value.color, borderColor: value.color + '40' }}>
                    {value.name}
                </span>
            ) : t('-')
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    }`}>
                    {value === 'active' ? t('Active') : t('Inactive')}
                </span>
            )
        },
        {
            key: 'is_converted',
            label: t('Converted'),
            render: (value: boolean) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                    : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                    }`}>
                    {value ? t('Yes') : t('No')}
                </span>
            )
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
            label: t('Convert to Account'),
            icon: 'Building2',
            action: 'convert-to-account',
            className: 'text-green-500',
            requiredPermission: 'convert-leads',
            condition: (item: any) => !item.is_converted
        },
        {
            label: t('Convert to Contact'),
            icon: 'Users',
            action: 'convert-to-contact',
            className: 'text-blue-500',
            requiredPermission: 'convert-leads',
            condition: (item: any) => !item.is_converted
        },
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-leads'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-leads'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-leads'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-leads'
        }
    ];

    return (
        <PageTemplate
            title={t("Leads")}
            description={t("Manage your leads")}
            url="/leads"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
            className={activeView === 'kanban' ? 'overflow-hidden' : ''}
        >

            {/* Search and filters section */}
            {/* <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4"> */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">

                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'lead_status_id',
                            label: t('Lead Status'),
                            type: 'select' as const,
                            searchable: true,
                            value: selectedLeadStatus,
                            onChange: setSelectedLeadStatus,
                            options: [
                                { value: 'all', label: t('All Statuses') },
                                ...allLeadStatuses.map((status: any) => ({
                                    value: status.id.toString(),
                                    label: status.name
                                }))
                            ]
                        },
                        {
                            name: 'lead_source_id',
                            label: t('Lead Source'),
                            type: 'select' as const,
                            searchable: true,
                            value: selectedLeadSource,
                            onChange: setSelectedLeadSource,
                            options: [
                                { value: 'all', label: t('All Sources') },
                                ...allLeadSources.map((source: any) => ({
                                    value: source.id.toString(),
                                    label: source.name
                                }))
                            ]
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select' as const,
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                                { value: 'all', label: t('All Status') },
                                { value: 'active', label: t('Active') },
                                { value: 'inactive', label: t('Inactive') }
                            ]
                        },
                        {
                            name: 'is_converted',
                            label: t('Conversion Status'),
                            type: 'select' as const,
                            value: selectedConverted,
                            onChange: setSelectedConverted,
                            options: [
                                { value: 'all', label: t('All Leads') },
                                { value: '1', label: t('Converted') },
                                { value: '0', label: t('Not Converted') }
                            ]
                        },
                        {
                            name: 'assigned_to',
                            label: t('Assigned To'),
                            type: 'select' as const,
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
                        }
                    ]}
                    // showFilters={showFilters}
                    // setShowFilters={setShowFilters}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    // onApplyFilters={applyFilters}
                    {...(activeView !== 'kanban' && {
                    })}
                    showViewToggle={true}
                    activeView={activeView}
                    onViewChange={(view) => {
                        setActiveView(view);
                        router.get(route('leads.index'), {
                            view,
                            page: pageFilters.page || undefined,
                            search: searchTerm || undefined,
                            lead_status_id: selectedLeadStatus !== 'all' ? selectedLeadStatus : undefined,
                            lead_source_id: selectedLeadSource !== 'all' ? selectedLeadSource : undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            is_converted: selectedConverted !== 'all' ? selectedConverted : undefined,
                            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
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
                        data={leads?.data || []}
                        from={leads?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                        entityPermissions={{
                            view: 'view-leads',
                            create: 'create-leads',
                            edit: 'edit-leads',
                            delete: 'delete-leads'
                        }}
                    />

                    {/* Pagination section */}
                    <Pagination
                        from={leads?.from || 1}
                        to={leads?.to || leads?.data?.length || 0}
                        total={leads?.total || leads?.data?.length || 0}
                        links={leads?.links}
                        entityName={t("leads")}
                        onPageChange={(url) => router.get(url)}
                        //  {...(activeView !== 'kanban' && {
                        currentPerPage={pageFilters.per_page?.toString() || "10"}
                        onPerPageChange={(value) => {
                            router.get(route('leads.index'), {
                                page: 1,
                                view: activeView,
                                search: searchTerm || undefined,
                                lead_status_id: selectedLeadStatus !== 'all' ? selectedLeadStatus : undefined,
                                lead_source_id: selectedLeadSource !== 'all' ? selectedLeadSource : undefined,
                                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                is_converted: selectedConverted !== 'all' ? selectedConverted : undefined,
                                assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                                sort_field: pageFilters.sort_field || undefined,
                                sort_direction: pageFilters.sort_direction || undefined,
                                ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            }, { preserveState: true, preserveScroll: true });
                        }}

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
                        ) : leadStatuses.map((status: any) => {
                            const statusLeads = kanbanData?.[status.id]?.items || [];
                            const colBg = status.color ? `${status.color}12` : '#f8fafc';
                            const colBorder = status.color ? `${status.color}30` : '#e2e8f0';
                            return (
                                <div
                                    key={status.id}
                                    className="flex-shrink-0 flex flex-col rounded-xl border"
                                    style={{ width: '300px', minWidth: '300px', backgroundColor: colBg, borderColor: colBorder, height: '100%' }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const leadId = e.dataTransfer.getData('leadId');
                                        if (!leadId) return;
                                        if (!hasPermission(permissions, 'edit-leads')) { toast.error(t('Permission denied.')); return; }
                                        const currentLead = Object.values(kanbanData).flatMap((c: any) => c.items).find((l: any) => l.id.toString() === leadId);
                                        if (currentLead) {
                                            toast.loading(t('Updating...'));
                                            router.put(route('leads.update', leadId), { ...(currentLead as any), lead_status_id: status.id }, {
                                                onSuccess: () => { toast.dismiss(); loadKanbanData(); },
                                                onError: () => { toast.dismiss(); toast.error(t('Failed to update lead status')); }
                                            });
                                        }
                                    }}
                                >
                                    {/* Column header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colBorder }}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }}></span>
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{status.name}</span>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: status.color + '22', color: status.color }}>
                                                {statusLeads.length}
                                            </span>
                                        </div>
                                        {hasPermission(permissions, 'create-leads') && (
                                            <button
                                                onClick={() => handleAddLead(status.id.toString())}
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/60 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                                title={t('Add Lead')}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Cards */}
                                    <div className="flex-1 overflow-y-auto kanban-col-scroll p-3 space-y-3">
                                        {statusLeads.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                                                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
                                                    <User className="h-6 w-6 text-gray-300" />
                                                </div>
                                                <p className="text-xs text-gray-400">{t('Drop leads here')}</p>
                                            </div>
                                        ) : statusLeads.map((lead: any) => (
                                            <div
                                                key={lead.id}
                                                draggable={hasPermission(permissions, 'edit-leads')}
                                                onDragStart={(e) => {
                                                    if (!hasPermission(permissions, 'edit-leads')) { e.preventDefault(); return; }
                                                    e.dataTransfer.setData('leadId', lead.id.toString());
                                                    e.currentTarget.classList.add('opacity-50');
                                                }}
                                                onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50')}
                                                className={hasPermission(permissions, 'edit-leads') ? 'cursor-grab active:cursor-grabbing' : ''}
                                            >
                                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                                                    <div className="p-3">
                                                        {/* Top row: avatar + name/email + menu */}
                                                        <div className="flex items-start gap-2.5 mb-2.5">
                                                            <UserInitials name={lead.name} />
                                                            <div className="flex-1 min-w-0">
                                                                <h4
                                                                    className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight truncate cursor-pointer hover:text-primary transition-colors"
                                                                    onClick={() => handleAction('view', lead)}
                                                                >
                                                                    {lead.name}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 truncate mt-0.5">{lead.email || t('No email')}</p>
                                                            </div>
                                                            {(hasPermission(permissions, 'view-leads') || hasPermission(permissions, 'edit-leads') || hasPermission(permissions, 'convert-leads') || hasPermission(permissions, 'delete-leads')) && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0 text-gray-400 hover:text-gray-600">
                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-40">
                                                                        {hasPermission(permissions, 'view-leads') && (
                                                                            <DropdownMenuItem onClick={() => handleAction('view', lead)}>
                                                                                <Eye className="h-4 w-4 mr-2 tex" />{t('View')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPermission(permissions, 'edit-leads') && (
                                                                            <DropdownMenuItem onClick={() => handleAction('edit', lead)}>
                                                                                <Edit className="h-4 w-4 mr-2" />{t('Edit')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPermission(permissions, 'convert-leads') && !lead.is_converted && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => handleAction('convert-to-account', lead)} className="text-green-600">
                                                                                    <Building2 className="h-4 w-4 mr-2" />{t('To Account')}
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleAction('convert-to-contact', lead)} className="text-blue-600">
                                                                                    <Users className="h-4 w-4 mr-2" />{t('To Contact')}
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                        {hasPermission(permissions, 'delete-leads') && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => handleAction('delete', lead)} className="text-red-600">
                                                                                    <Trash2 className="h-4 w-4 mr-2" />{t('Delete')}
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>

                                                        {/* Company */}
                                                        {lead.company && (
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                                <span className="text-xs text-gray-500 truncate">{lead.company}</span>
                                                            </div>
                                                        )}

                                                        {/* Value */}
                                                        {lead.value && (
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <Banknote className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                                <span className="text-xs font-semibold font-mono text-gray-700 dark:text-gray-300">
                                                                    {window.appSettings?.formatCurrency(parseFloat(lead.value)) || `$${parseFloat(lead.value).toFixed(2)}`}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Source badge + converted badge */}
                                                        {(lead.lead_source || lead.is_converted) && (
                                                            <div className="flex flex-wrap gap-1 mb-2.5">
                                                                {lead.lead_source && (
                                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-gray-600/20">
                                                                        {lead.lead_source.name}
                                                                    </span>
                                                                )}
                                                                {lead.is_converted && (
                                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                                                        {t('Converted')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Footer: date + assigned avatar */}
                                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <LucidIcons.Calendar className="h-3 w-3" />
                                                                <span>
                                                                    {window.appSettings?.formatDateTime(lead.created_at, false) || new Date(lead.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            {lead.assigned_user ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Avatar className="h-7 w-7 cursor-pointer">
                                                                                <AvatarImage src={lead.assigned_user.avatar} />
                                                                                <AvatarFallback className="text-xs" style={{ backgroundColor: status.color + '33', color: status.color }}>
                                                                                    {getInitials(lead.assigned_user.name)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{lead.assigned_user.name}</TooltipContent>
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
                    {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {leads?.data?.map((lead: any) => (
                            <Card key={lead.id} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start space-x-4">
                                            <div className="h-16 w-16 rounded-full bg-primary/15 text-primary ring-1 ring-primary flex items-center justify-center text-lg font-bold">
                                                {getInitials(lead.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{lead.name}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{lead.email || t('No email')}</p>
                                                <div className="flex items-center">
                                                    <div className={`h-2 w-2 rounded-full mr-2 ${lead.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                                                        }`}></div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {lead.status === 'active' ? t('Active') : t('Inactive')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div> */}

                    {/* Actions dropdown */}
                    {/* {(hasPermission(permissions, 'view-leads') || hasPermission(permissions, 'edit-leads') || hasPermission(permissions, 'convert-leads') || hasPermission(permissions, 'delete-leads') || hasPermission(permissions, 'toggle-status-leads') || hasPermission(permissions, 'edit-leads')) && <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
                                                {hasPermission(permissions, 'view-leads') && (
                                                    <DropdownMenuItem onClick={() => handleAction('view', lead)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        <span>{t("View Lead")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'toggle-status-leads') && (
                                                    <DropdownMenuItem onClick={() => handleAction('toggle-status', lead)}>
                                                        <Lock className="h-4 w-4 mr-2" />
                                                        <span>{lead.status === 'active' ? t("Deactivate") : t("Activate")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'convert-leads') && !lead.is_converted && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => handleAction('convert-to-account', lead)} className="text-green-600">
                                                            <Building2 className='mr-2 w-4 h-4' />
                                                            <span>{t("Convert to Account")}</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAction('convert-to-contact', lead)} className="text-blue-600">
                                                            <Users className='mr-2 w-4 h-4' />
                                                            <span>{t("Convert to Contact")}</span>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                <DropdownMenuSeparator />
                                                {hasPermission(permissions, 'edit-leads') && (
                                                    <DropdownMenuItem onClick={() => handleAction('edit', lead)} className="text-amber-600">
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        <span>{t("Edit")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'delete-leads') && (
                                                    <DropdownMenuItem onClick={() => handleAction('delete', lead)} className="text-rose-600">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        <span>{t("Delete")}</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        }
                                    </div> */}

                    {/* Lead info */}
                    {/* <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-4">
                                        <div className="mb-2">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {t('Company')}: {lead.company || t('-')}
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {t('Value')}: {lead.value ? (window.appSettings?.formatCurrency(parseFloat(lead.value)) || `$${parseFloat(lead.value).toFixed(2)}`) : t('-')}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {lead.lead_status && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset " style={{
                                                    backgroundColor: `${lead.lead_status.color}20`,
                                                    color: lead.lead_status.color,
                                                    borderColor: `${lead.lead_status.color}40`
                                                }}>
                                                    {lead.lead_status.name}
                                                </span>
                                            )}
                                            {lead.is_converted && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-green-50 text-green-700 ring-green-600/20">
                                                    {t('Converted')}
                                                </span>
                                            )}
                                        </div>
                                    </div> */}

                    {/* Created date */}
                    {/* <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                        {t("Created:")} {window.appSettings?.formatDateTime(lead.created_at, false) || new Date(lead.created_at).toLocaleDateString()}
                                    </div> */}
                    {/* <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                                        <span>{t("Created:")}</span>

                                        {lead.created_at && <LucidIcons.Calendar className="h-4 w-4" />}

                                        <span>
                                            {window.appSettings?.formatDateTime(lead.created_at, false) ||
                                                new Date(lead.created_at).toLocaleDateString()}
                                        </span>
                                    </div> */}

                    {/* Action buttons */}
                    {/* <div className="flex gap-2">
                                        {hasPermission(permissions, 'edit-leads') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('edit', lead)}
                                                className="flex-1 h-9 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                {t("Edit")}
                                            </Button>
                                        )}

                                        {hasPermission(permissions, 'view-leads') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('view', lead)}
                                                className="flex-1 h-9 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                {t("View")}
                                            </Button>
                                        )}

                                        {hasPermission(permissions, 'delete-leads') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction('delete', lead)}
                                                className="flex-1 h-9 text-sm text-gray-700 border-gray-300 dark:border-gray-600 dark:text-gray-200"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                {t("Delete")}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div> */}

                    {/* Pagination for grid view */}
                    <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                        <Pagination
                            from={leads?.from || 1}
                            to={leads?.to || leads?.data?.length || 0}
                            total={leads?.total || leads?.data?.length || 0}
                            links={leads?.links}
                            entityName={t("leads")}
                            onPageChange={(url) => router.get(url)}
                            perPageOptions={[12, 24, 48, 96]}
                            currentPerPage={pageFilters.per_page?.toString() || '12'}
                            onPerPageChange={(value) => {
                                router.get(route('leads.index'), {
                                    page: 1,
                                    view: activeView,
                                    search: searchTerm || undefined,
                                    lead_status_id: selectedLeadStatus !== 'all' ? selectedLeadStatus : undefined,
                                    lead_source_id: selectedLeadSource !== 'all' ? selectedLeadSource : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                    is_converted: selectedConverted !== 'all' ? selectedConverted : undefined,
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

            {/* Export Modal - mounted for export functionality only */}
            {hasPermission(permissions, 'export-leads') && (
                <CrudFormModal
                    isOpen={false}
                    onClose={() => { }}
                    onSubmit={() => { }}
                    formConfig={{
                        exportRoute: 'lead.export',
                        fields: []
                    }}
                    initialData={null}
                    title=''
                    mode='create'
                />
            )}

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('lead')}
            />

            {/* Convert Modal */}
            <CrudFormModal
                isOpen={isConvertModalOpen}
                onClose={() => setIsConvertModalOpen(false)}
                onSubmit={handleConvertSubmit}
                formConfig={{
                    fields: convertType === 'account' ? [
                        {
                            name: 'account_type_id',
                            label: t('Account Type'),
                            type: 'select',
                            required: true,
                            searchable: true,
                            options: accountTypes.map((type: any) => ({
                                value: type.id,
                                label: type.name
                            })),
                            emptyNote: accountTypes.length === 0 ? {
                                link: route('account-types.index'),
                                linkText: t('Account Types')
                            } : undefined
                        },
                        {
                            name: 'account_industry_id',
                            label: t('Account Industry'),
                            type: 'select',
                            required: true,
                            searchable: true,
                            options: accountIndustries.map((industry: any) => ({
                                value: industry.id,
                                label: industry.name
                            })),
                            emptyNote: accountIndustries.length === 0 ? {
                                link: route('account-industries.index'),
                                linkText: t('Account Industries')
                            } : undefined
                        },
                        { name: 'website', label: t('Website'), type: 'text', colSpan: 2, placeholder: 'eg. https://example.com' },
                        { name: 'billing_address', label: t('Billing Address'), type: 'textarea', required: true, colSpan: 2, placeholder: t('eg. 123 Main St') },
                        { name: 'billing_city', label: t('Billing City'), type: 'text', required: true, placeholder: t('eg. New York') },
                        { name: 'billing_state', label: t('Billing State'), type: 'text', required: true, placeholder: t('eg. NY') },
                        { name: 'billing_postal_code', label: t('Billing Postal Code'), type: 'text', required: true, placeholder: t('eg. 10001') },
                        { name: 'billing_country', label: t('Billing Country'), type: 'text', required: true, placeholder: t('eg. United States') },
                        {
                            name: 'billing_shipping_section',
                            type: 'custom',
                            render: (field: any, formData: any, handleChange: any) => (
                                <div className="flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setTimeout(() => {
                                                const textareas = document.querySelectorAll('textarea');
                                                const shippingTextarea = textareas[textareas.length - 1];
                                                if (shippingTextarea && formData.billing_address) {
                                                    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                                                    nativeTextareaSetter.call(shippingTextarea, formData.billing_address);
                                                    shippingTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                                                    shippingTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                                                }
                                            }, 10);

                                            setTimeout(() => {
                                                const inputs = document.querySelectorAll('input[type="text"]');
                                                const textInputs = Array.from(inputs).filter(input => input.getAttribute('type') === 'text');
                                                const shippingTextInputs = textInputs.slice(-4);
                                                const billingValues = [formData.billing_city, formData.billing_state, formData.billing_postal_code, formData.billing_country];

                                                shippingTextInputs.forEach((input, index) => {
                                                    setTimeout(() => {
                                                        if (billingValues[index]) {
                                                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                                                            nativeInputValueSetter.call(input, billingValues[index]);
                                                            input.dispatchEvent(new Event('input', { bubbles: true }));
                                                            input.dispatchEvent(new Event('change', { bubbles: true }));
                                                        }
                                                    }, index * 20);
                                                });
                                            }, 50);
                                        }}
                                        className="w-full"
                                    >
                                        {t('Copy Billing to Shipping Address')}
                                    </Button>
                                </div>
                            )
                        },
                        { name: 'shipping_address', label: t('Shipping Address'), type: 'textarea', colSpan: 2, placeholder: t('eg. 456 Elm St') },
                        { name: 'shipping_city', label: t('Shipping City'), type: 'text', placeholder: t('eg. Los Angeles') },
                        { name: 'shipping_state', label: t('Shipping State'), type: 'text', placeholder: t('eg. CA') },
                        { name: 'shipping_postal_code', label: t('Shipping Postal Code'), type: 'text', placeholder: t('eg. 90001') },
                        { name: 'shipping_country', label: t('Shipping Country'), type: 'text', placeholder: t('eg. United States') },
                    ] : [
                        {
                            name: 'account_id',
                            label: t('Account'),
                            type: 'select',
                            required: true,
                            searchable: true,
                            colSpan: 2,
                            options: accounts.map((account: any) => ({
                                value: account.id,
                                label: account.name
                            })),
                            emptyNote: accounts.length === 0 ? {
                                link: route('accounts.index'),
                                linkText: t('Accounts')
                            } : undefined
                        },
                        { name: 'position', label: t('Position'), type: 'text', colSpan: 2, placeholder: t('eg. CEO, Manager, Developer') },
                        { name: 'address', label: t('Address'), type: 'textarea', required: true, colSpan: 2, placeholder: t('eg. 123 Main St, City, Country') }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? {
                    account_industry_id: currentItem.account_industry_id,
                    billing_address: currentItem.address,
                    address: currentItem.address,
                    website: convertType === 'account' ? currentItem.website : undefined
                } : null}
                title={t(`Convert Lead to ${convertType === 'account' ? 'Account' : 'Contact'}`)}
                mode="create"
            />

            {/* Import Modal */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => { importingRef.current = true; setIsImportModalOpen(false); }}
                title={t('Import Leads from CSV/Excel')}
                importRoute="lead.import"
                parseRoute="lead.parse"
                samplePath={samplePath}
                importNotes={t('Ensure that the values entered for Lead Status, Lead Source, Account Industry, Campaign match the existing records in your system.')}
                databaseFields={[
                    { key: 'name', required: true },
                    { key: 'email', required: true },
                    { key: 'phone' },
                    { key: 'company' },
                    { key: 'account_name' },
                    { key: 'account_industry' },
                    { key: 'website' },
                    { key: 'position' },
                    { key: 'value' },
                    { key: 'lead_status', required: true },
                    { key: 'lead_source', required: true },
                    { key: 'address' },
                    { key: 'campaign' },
                    { key: 'notes' },
                    { key: 'status' }
                ]}
            />

        </PageTemplate>
    );
}
