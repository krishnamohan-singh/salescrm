import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Search, Filter, X, Tag, Check, Phone, Mail, Users, Video, Clock, CheckSquare, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TaskTypesIndex() {
    const { t } = useTranslation();
    const { taskTypes, filters = {} } = usePage().props as any;

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        icon: 'CheckSquare',
        color: '#3b82f6',
        description: '',
        status: 'active',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Task Management') },
        { title: t('Tasks & Follow-ups'), href: route('tasks.index') },
        { title: t('Task Types') },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('task-types.index'), {
            search: search || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        router.get(route('task-types.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const handleOpenCreate = () => {
        setEditingType(null);
        setFormData({
            name: '',
            icon: 'CheckSquare',
            color: '#3b82f6',
            description: '',
            status: 'active',
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingType(item);
        setFormData({
            name: item.name || '',
            icon: item.icon || 'CheckSquare',
            color: item.color || '#3b82f6',
            description: item.description || '',
            status: item.status || 'active',
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = t('Name is required');

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        if (editingType) {
            router.put(route('task-types.update', editingType.id), formData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err: any) => {
                    setFormErrors(err);
                    setSubmitting(false);
                },
            });
        } else {
            router.post(route('task-types.store'), formData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err: any) => {
                    setFormErrors(err);
                    setSubmitting(false);
                },
            });
        }
    };

    const iconList = [
        { name: 'CheckSquare', label: t('Checklist / Task'), icon: CheckSquare },
        { name: 'Clock', label: t('Follow-up'), icon: Clock },
        { name: 'Phone', label: t('Call'), icon: Phone },
        { name: 'Users', label: t('Meeting'), icon: Users },
        { name: 'Mail', label: t('Email'), icon: Mail },
        { name: 'Video', label: t('Demo / Video'), icon: Video },
        { name: 'FileText', label: t('Document / Review'), icon: FileText },
    ];

    const colorPresets = [
        '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b',
        '#ec4899', '#8b5cf6', '#ef4444', '#64748b', '#14b8a6'
    ];

    const renderIcon = (iconName: string, className = 'h-4 w-4') => {
        switch (iconName) {
            case 'Phone': return <Phone className={className} />;
            case 'Mail': return <Mail className={className} />;
            case 'Users': return <Users className={className} />;
            case 'Video': return <Video className={className} />;
            case 'Clock': return <Clock className={className} />;
            case 'FileText': return <FileText className={className} />;
            default: return <CheckSquare className={className} />;
        }
    };

    return (
        <PageTemplate
            title={t('Task Types')}
            description={t('Define activity classifications such as Follow-ups, Calls, Meetings, and Demos')}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Add Task Type'),
                    icon: <Plus className="h-4 w-4 mr-2" />,
                    variant: 'default',
                    onClick: handleOpenCreate,
                },
            ]}
            noPadding
        >
            <div className="space-y-6">
                {/* Search & Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('Search type name...')}
                                    className="pl-9 h-9"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                                <SelectTrigger className="w-[140px] h-9">
                                    <SelectValue placeholder={t('State')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All States')}</SelectItem>
                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button type="submit" size="sm" className="h-9">
                                <Filter className="h-3.5 w-3.5 mr-1.5" />
                                {t('Filter')}
                            </Button>
                            {(search || statusFilter !== 'all') && (
                                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters} className="h-9">
                                    <X className="h-3.5 w-3.5 mr-1.5" />
                                    {t('Reset')}
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Types Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase text-gray-500">
                                <tr>
                                    <th className="px-5 py-3.5">{t('Type Name')}</th>
                                    <th className="px-5 py-3.5">{t('Icon / Badge')}</th>
                                    <th className="px-5 py-3.5">{t('Description')}</th>
                                    <th className="px-5 py-3.5">{t('State')}</th>
                                    <th className="px-5 py-3.5 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {taskTypes?.data?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-400">
                                            <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                            <p>{t('No task types found.')}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    taskTypes?.data?.map((type: any) => (
                                        <tr key={type.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                                            <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="p-1.5 rounded-lg flex items-center justify-center text-white"
                                                        style={{ backgroundColor: type.color }}
                                                    >
                                                        {renderIcon(type.icon, 'h-4 w-4')}
                                                    </div>
                                                    <span>{type.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                                    style={{
                                                        backgroundColor: `${type.color}15`,
                                                        color: type.color,
                                                        borderColor: `${type.color}40`,
                                                    }}
                                                >
                                                    {renderIcon(type.icon, 'h-3 w-3')}
                                                    {type.name}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                {type.description || '—'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() => router.put(route('task-types.toggle-status', type.id), {}, { preserveScroll: true })}
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                                        type.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}
                                                >
                                                    {type.status === 'active' ? t('Active') : t('Inactive')}
                                                </button>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(type)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => {
                                                                        setTypeToDelete(type);
                                                                        setIsDeleteModalOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create / Edit Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingType ? t('Edit Task Type') : t('Create Task Type')}</DialogTitle>
                            <DialogDescription>{t('Configure type name, icon, and badge theme.')}</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="type-name" required>{t('Type Name')}</Label>
                                <Input
                                    id="type-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('e.g. Phone Call, Product Demo')}
                                    className={formErrors.name ? 'border-red-500' : ''}
                                />
                                {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                            </div>

                            {/* Icon Choice */}
                            <div className="space-y-1.5">
                                <Label htmlFor="type-icon">{t('Icon')}</Label>
                                <Select value={formData.icon} onValueChange={(val) => setFormData({ ...formData, icon: val })}>
                                    <SelectTrigger id="type-icon"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {iconList.map((ic) => (
                                            <SelectItem key={ic.name} value={ic.name}>
                                                <div className="flex items-center gap-2">
                                                    <ic.icon className="h-4 w-4" />
                                                    <span>{ic.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Color Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="type-color">{t('Color Theme')}</Label>
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-wrap gap-2">
                                        {colorPresets.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: c })}
                                                className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${formData.color === c ? 'scale-125 ring-2 ring-primary ring-offset-2' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: c }}
                                            >
                                                {formData.color === c && <Check className="h-3 w-3 text-white stroke-[3]" />}
                                            </button>
                                        ))}
                                    </div>
                                    <Input
                                        id="type-color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-10 h-8 p-0.5 rounded cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="type-state">{t('State')}</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger id="type-state"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="type-desc">{t('Description (Optional)')}</Label>
                                <Textarea
                                    id="type-desc"
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('Short summary of what this activity represents...')}
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('Cancel')}</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? t('Saving...') : (editingType ? t('Update Type') : t('Create Type'))}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Modal */}
                <CrudDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={() => {
                        if (typeToDelete) {
                            router.delete(route('task-types.destroy', typeToDelete.id), { preserveScroll: true });
                            setIsDeleteModalOpen(false);
                        }
                    }}
                    itemName={typeToDelete?.name || ''}
                    entityName={t('Task Type')}
                />
            </div>
        </PageTemplate>
    );
}
