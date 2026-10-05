import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Edit, Trash2, Download, FileText, FileImage, ExternalLink, ArrowLeft, FileSpreadsheet, FileCode, FileArchive, FileVideo, FileAudio, File, Lock, Unlock, User, AlertTriangle, Tag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getDisplayUrl } from '@/utils/helper';
import { useInitials } from '@/hooks/use-initials';
import * as LucidIcons from "lucide-react";

export default function DocumentShow() {
    const { t } = useTranslation();
    const {
        auth,
        document,
        users = [],
        accounts = [],
        folders = [],
        types = [],
        opportunities = []
    } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const flash = (usePage().props as any).flash || {};

    useEffect(() => {
        if (flash.error) toast.error(t(flash.error));
        if (flash.success_title) toast.success(t(flash.success_title));
        if (flash.success) toast.success(t(flash.success));
        if (!hasPermission(permissions, 'view-documents')) {
            toast.error(t('Permission denied.'));
            router.get(document.folder?.id ? route('documents.folder', document.folder.id) : route('documents.index'));
        }
    }, []);

    const getInitials = useInitials();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const getExt = (url: string) => url?.split('?')[0].split('.').pop()?.toLowerCase() || '';
    const isImageExt = (ext: string) => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);

    const extConfig: Record<string, { icon: any; bg: string; color: string }> = {
        pdf: { icon: FileText, bg: 'bg-red-100', color: 'text-red-600' },
        doc: { icon: FileText, bg: 'bg-blue-100', color: 'text-blue-600' },
        docx: { icon: FileText, bg: 'bg-blue-100', color: 'text-blue-600' },
        xls: { icon: FileSpreadsheet, bg: 'bg-green-100', color: 'text-green-600' },
        xlsx: { icon: FileSpreadsheet, bg: 'bg-green-100', color: 'text-green-600' },
        csv: { icon: FileSpreadsheet, bg: 'bg-green-100', color: 'text-green-600' },
        txt: { icon: FileText, bg: 'bg-gray-100', color: 'text-gray-600' },
        zip: { icon: FileArchive, bg: 'bg-yellow-100', color: 'text-yellow-600' },
        rar: { icon: FileArchive, bg: 'bg-yellow-100', color: 'text-yellow-600' },
        json: { icon: FileCode, bg: 'bg-purple-100', color: 'text-purple-600' },
        xml: { icon: FileCode, bg: 'bg-purple-100', color: 'text-purple-600' },
    };

    const extIconConfig: Record<string, { icon: any; color: string }> = {
        doc: { icon: FileText, color: 'text-blue-600' },
        docx: { icon: FileText, color: 'text-blue-600' },
        xls: { icon: FileSpreadsheet, color: 'text-green-600' },
        xlsx: { icon: FileSpreadsheet, color: 'text-green-600' },
        csv: { icon: FileSpreadsheet, color: 'text-teal-500' },
        zip: { icon: FileArchive, color: 'text-yellow-600' },
        rar: { icon: FileArchive, color: 'text-yellow-600' },
        json: { icon: FileCode, color: 'text-purple-600' },
        xml: { icon: FileCode, color: 'text-purple-600' },
        txt: { icon: FileText, color: 'text-gray-500' },
    };

    const getFileIcon = (url: string, name: string, size = 'h-20 w-20') => {
        const ext = getExt(url || name || '');
        if (isImageExt(ext)) return <FileImage className={`${size} text-primary`} strokeWidth={1.2} />;
        if (ext === 'pdf') return <FileText className={`${size} text-red-500`} strokeWidth={1.2} />;
        if (ext === 'doc' || ext === 'docx') return <FileText className={`${size} text-blue-500`} strokeWidth={1.2} />;
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className={`${size} text-green-500`} strokeWidth={1.2} />;
        if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return <FileVideo className={`${size} text-pink-500`} strokeWidth={1.2} />;
        if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return <FileAudio className={`${size} text-yellow-500`} strokeWidth={1.2} />;
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive className={`${size} text-orange-500`} strokeWidth={1.2} />;
        if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'php', 'py'].includes(ext)) return <FileCode className={`${size} text-cyan-500`} strokeWidth={1.2} />;
        return <File className={`${size} text-gray-400`} strokeWidth={1.2} />;
    };

    const handleFormSubmit = (formData: any) => {
        toast.loading(t('Updating document...'));
        router.put(route('documents.update', document.id), formData, {
            onSuccess: (page) => {
                setIsFormModalOpen(false);
                toast.dismiss();
                if (page.props.flash.success_title) toast.success(t(page.props.flash.success_title));
                if (page.props.flash.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting document...'));
        router.delete(route('documents.destroy', document.id), {
            onSuccess: (page) => {
                toast.dismiss();
                if (page.props.flash.success_title) toast.success(t(page.props.flash.success_title));
                if (page.props.flash.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash.error) toast.error(t(page.props.flash.error));
                router.get(document.folder?.id ? route('documents.folder', document.folder.id) : route('documents.index'));
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to delete: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleDownload = () => {
        const link = window.document.createElement('a');
        link.href = route('documents.download', document.id);
        link.download = document.name;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
    };

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => document.folder?.id ? router.get(route('documents.folder', document.folder.id)) : router.get(route('documents.index'))
        }
    ];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Document Management') },
        { title: t('Documents'), href: route('documents.index') },
        ...(document.folder ? [{ title: document.folder.name, href: route('documents.folder', document.folder.id) }] : []),
        { title: document.name }
    ];

    const formFields = [
        { name: 'name', label: t('Document Name'), type: 'text', required: true },
        { name: 'account_id', label: t('Account'), type: 'select', options: [{ value: 'null', label: t('No Account') }, ...accounts.map((a: any) => ({ value: a.id, label: a.name }))] },
        { name: 'folder_id', label: t('Folder'), type: 'select', options: [{ value: 'null', label: t('No Folder') }, ...folders.map((f: any) => ({ value: f.id, label: f.name }))] },
        { name: 'type_id', label: t('Type'), type: 'select', options: [{ value: 'null', label: t('No Type') }, ...types.map((type: any) => ({ value: type.id, label: type.type_name }))] },
        { name: 'opportunity_id', label: t('Opportunity'), type: 'select', options: [{ value: 'null', label: t('No Opportunity') }, ...opportunities.map((o: any) => ({ value: o.id, label: o.name }))] },
        { name: 'publish_date', label: t('Publish Date'), type: 'date' },
        { name: 'expiration_date', label: t('Expiration Date'), type: 'date' },
        { name: 'attachment', label: t('Attachment'), type: 'media-picker', returnType: 'id', placeholder: t('Select file...') },
        { name: 'assigned_to', label: t('Assign To'), type: 'select', options: [{ value: 'null', label: t('Unassigned') }, ...users.map((u: any) => ({ value: u.id, label: `${u.name} (${u.email})` }))] },
        { name: 'description', label: t('Description'), type: 'textarea' },
        { name: 'status', label: t('Status'), type: 'select', options: [{ value: 'active', label: t('Active') }, { value: 'inactive', label: t('Inactive') }] }
    ];

    const ext = getExt(document.attachment_url || '');
    const isImage = isImageExt(ext);
    const isInactive = document.status !== 'active';
    const isExpired = document.expiration_date && new Date(document.expiration_date) < new Date();
    const cfg = { ...(extConfig[ext] || { icon: File, bg: 'bg-gray-100', color: 'text-gray-500' }) };
    const Icon = cfg.icon;

    const handleToggleStatus = () => {
        toast.loading(t('Updating status...'));
        router.put(route('documents.toggle-status', document.id), {}, {
            onSuccess: (page) => { toast.dismiss(); if (page.props.flash.success_title) toast.success(t(page.props.flash.success_title)); if (page.props.flash.success) toast.success(t(page.props.flash.success)); },
            onError: () => { toast.dismiss(); toast.error(t('Failed to update status')); }
        });
    };

    return (
        <PageTemplate title={document.name} description={t('Document details and related information')} url={`/documents/${document.id}`} actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            {/* Outer container */}
            <div className="-mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-4 space-y-4">

                {/* (1) Document Header Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className={`h-1.5 w-full ${isExpired ? 'bg-red-500' : 'bg-primary'}`} />
                    <div className="flex items-center gap-3 px-4 py-3">
                        <Avatar className="h-14 w-14 flex-shrink-0 rounded-xl">
                            <AvatarImage
                                src={document.assigned_user?.avatar ? getDisplayUrl(document.assigned_user.avatar) : getDisplayUrl('avatars/avatar.png')}
                                className="rounded-xl object-cover"
                                onError={(e) => { e.currentTarget.src = getDisplayUrl('avatars/avatar.png'); }}
                            />
                            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-semibold">
                                <User className="h-6 w-6" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">{document.name}</h1>
                            <div className="mt-1 flex items-center gap-3 flex-wrap">
                                {document.assigned_user?.name && (
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <User className="h-3 w-3" />{document.assigned_user.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* (2) + (3) Two-column: file preview left, details right */}
                <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-4 items-start pe-4">

                    {/* (2) Document Preview Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex items-center justify-center" style={{ minHeight: '690px' }}>
                        {(() => {
                            if (!document.attachment_url) {
                                return (
                                    <div className="flex flex-col items-center gap-3 text-gray-400 py-20">
                                        <FileText className="h-20 w-20" strokeWidth={1} />
                                        <p className="text-sm">{t('No file attached')}</p>
                                    </div>
                                );
                            }
                            const ext = getExt(document.attachment_url);
                            if (isImageExt(ext)) {
                                return (
                                    <img
                                        src={getDisplayUrl(document.attachment_url)}
                                        alt={document.name}
                                        className="w-full h-full object-contain rounded-xl"
                                        style={{ maxHeight: '690px', padding: '16px' }}
                                        onError={(e) => { e.currentTarget.src = getDisplayUrl('product/default.svg'); }}
                                    />
                                );
                            }
                            const cfg = extConfig[ext] || { icon: File, bg: 'bg-gray-100', color: 'text-gray-500' };
                            const Icon = cfg.icon;
                            return (
                                <div className="flex flex-col items-center gap-4 py-20">
                                    {getFileIcon(document.attachment_url, document.name)}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs truncate">{document.name}</p>
                                </div>
                            );
                        })()}
                    </div>

                    {/* (3) Document Details Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
                                <FileText className="h-4 w-4 text-gray-500" />
                                {t('Document Details')}
                            </div>
                            <div className="flex items-center gap-1.5">
                                {hasPermission(permissions, 'view-documents') && document.attachment_url && (
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                        <a href={getDisplayUrl(document.attachment_url)} target="_blank" rel="noreferrer">
                                            <button className="h-7 w-7 flex items-center justify-center rounded-lg text-cyan-500 transition-colors">
                                                <ExternalLink className="h-4 w-4 text-gray-500" />
                                            </button>
                                        </a>
                                    </TooltipTrigger><TooltipContent>{t('Open in new tab')}</TooltipContent></Tooltip></TooltipProvider>
                                )}
                                {hasPermission(permissions, 'view-documents') && document.attachment_url && (
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                        <button className="h-7 w-7 flex items-center justify-center rounded-lg text-green-500 transition-colors" onClick={handleDownload}>
                                            <Download className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </TooltipTrigger><TooltipContent>{t('Download')}</TooltipContent></Tooltip></TooltipProvider>
                                )}
                                {hasPermission(permissions, 'toggle-status-documents') && (
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                        <button className="h-7 w-7 flex items-center justify-center rounded-lg text-amber-500 transition-colors" onClick={handleToggleStatus}>
                                            {isInactive ? <Unlock className="h-4 w-4 text-gray-500" /> : <Lock className="h-4 w-4 text-gray-500" />}
                                        </button>
                                    </TooltipTrigger><TooltipContent>{isInactive ? t('Activate') : t('Toggle Status')}</TooltipContent></Tooltip></TooltipProvider>
                                )}
                                {hasPermission(permissions, 'edit-documents') && (
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                        <button className="h-7 w-7 flex items-center justify-center rounded-lg text-amber-500 transition-colors" onClick={() => setIsFormModalOpen(true)}>
                                            <Edit className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip></TooltipProvider>
                                )}
                                {hasPermission(permissions, 'delete-documents') && (
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                        <button className="h-7 w-7 flex items-center justify-center rounded-lg text-red-500 transition-colors" onClick={() => setIsDeleteModalOpen(true)}>
                                            <Trash2 className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip></TooltipProvider>
                                )}
                            </div>
                        </div>
                        {/* Rows */}
                        <div>
                            <DetailRow label={t('Folder')} value={document.folder?.name} />
                            <DetailRow label={t('Type')} value={document.type?.type_name} badge />
                            <DetailRow
                                label={t('Status')}
                                value={document.status === 'active' ? t('Active') : t('Inactive')}
                                badgeColor={document.status === 'active' ? 'green' : 'red'}
                                badge
                            />
                            <DetailRow
                                label={t('Document Status')}
                                value={document.expiration_date && new Date(document.expiration_date) < new Date() ? t('Expired') : t('Valid')}
                                badgeColor={document.expiration_date && new Date(document.expiration_date) < new Date() ? 'red' : 'green'}
                                badge
                            />
                            {document.publish_date && (
                                <DetailRow
                                    label={t('Publish Date')}
                                    value={
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            {document.publish_date && (
                                                <LucidIcons.Calendar className="h-4 w-4" />
                                            )}
                                            <span>
                                                {window.appSettings?.formatDateTime(document.publish_date, false) ||
                                                    new Date(document.publish_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    }
                                />
                            )}
                            {document.expiration_date && (
                                // <DetailRow
                                //     label={t('Expiration Date')}
                                //     value={window.appSettings?.formatDateTime(document.expiration_date, false) || new Date(document.expiration_date).toLocaleDateString()}
                                //     expired={isExpired}
                                // />
                                <DetailRow
    label={t('Expiration Date')}
    value={
        <div className="flex items-center gap-2 whitespace-nowrap">
            <LucidIcons.Calendar
                className={`h-4 w-4 ${
                    isExpired ? 'text-red-500' : 'text-gray-500'
                }`}
            />
            <span
                className={isExpired ? 'text-red-500' : ''}
            >
                {window.appSettings?.formatDateTime(document.expiration_date, false) ||
                    new Date(document.expiration_date).toLocaleDateString()}
            </span>
        </div>
    }
    expired={isExpired}
/>
                            )}
                            <DetailRow label={t('Created At')}
                                value={
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        {document.created_at && (
                                            <LucidIcons.Calendar className="h-4 w-4" />
                                        )}
                                        <span>
                                            {window.appSettings?.formatDateTime(document.created_at, false) ||
                                                new Date(document.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                }
                            />
                        </div>
                        {document.description && (
                            <div className="pl-4 pr-3 py-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="mb-1 text-sm font-bold text-gray-800 dark:text-gray-100">{t('Description')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed break-words whitespace-pre-wrap">{document.description}</p>
                            </div>
                        )}
                        {document.opportunity?.name && (
                            <div className="pl-4 pr-3 py-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="mb-1 text-sm font-bold text-gray-800 dark:text-gray-100">{t('Opportunity')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed break-words">{document.opportunity.name}</p>
                            </div>
                        )}
                        {document.account ? (
                            <div className="pl-4 pr-3 py-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Account')}</p>
                                <div className="flex items-center gap-2">
                                    <Avatar className="w-7 h-7 flex-shrink-0">
                                        <AvatarImage src={document.account.avatar} alt={document.account.name} />
                                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(document.account.name || '')}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{document.account.name}</p>
                                        {document.account.email && <p className="text-xs text-muted-foreground truncate">{document.account.email}</p>}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        {document.assigned_user ? (
                            <div className="pl-4 pr-3 py-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Assigned To')}</p>
                                <div className="flex items-center gap-2">
                                    <Avatar className="w-7 h-7 flex-shrink-0">
                                        <AvatarImage src={document.assigned_user.avatar} alt={document.assigned_user.name} />
                                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(document.assigned_user.name || '')}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{document.assigned_user.name}</p>
                                        {document.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{document.assigned_user.email}</p>}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{ fields: formFields, modalSize: 'xl' }}
                initialData={{
                    name: document.name,
                    account_id: document.account_id ?? 'null',
                    folder_id: document.folder_id ?? 'null',
                    type_id: document.type_id ?? 'null',
                    opportunity_id: document.opportunity_id ?? 'null',
                    publish_date: document.publish_date || '',
                    expiration_date: document.expiration_date || '',
                    attachment: document.attachment || '',
                    assigned_to: document.assigned_to ?? 'null',
                    description: document.description || '',
                    status: document.status || 'active',
                }}
                title={t('Edit Document')}
                mode="edit"
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={document.name || ''}
                entityName={t('document')}
            />
        </PageTemplate>
    );
}

function DetailRow({ label, value, badge = false, badgeColor = 'blue', expired = false }: { label: string; value?: string; badge?: boolean; badgeColor?: string; expired?: boolean }) {
    const { t } = useTranslation();
    if (!value) return null;

    const badgeColors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300',
        green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-300',
        red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/30 dark:text-red-300',
    };

    return (
        <div className="flex items-center justify-between pl-4 pr-3 py-2.5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 shrink-0 mr-3">{label}</p>
            {badge ? (
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${badgeColors[badgeColor] || badgeColors.blue}`}>{value}</span>
            ) : expired ? (
                <p className="text-sm font-medium text-red-500 text-right">{value}</p>
            ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-right">{value}</p>
            )}
        </div>
    );
}
