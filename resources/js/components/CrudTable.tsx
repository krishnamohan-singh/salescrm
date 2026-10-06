// components/CrudTable.tsx
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import * as LucidIcons from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { TableColumn, TableAction } from '@/types/crud';
import { Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

interface CrudTableProps {
    columns: TableColumn[];
    actions: TableAction[];
    data: any[];
    from: number;
    onAction: (action: string, row: any) => void;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
    statusColors?: Record<string, string>;
    permissions: string[];
    entityPermissions?: {
        view: string;
        edit: string;
        delete: string;
    };
    showActionsAsIcons?: boolean;
    onRowClick?: (row: any, e?: React.MouseEvent) => void;
}

export function CrudTable({
    columns,
    actions,
    data,
    from,
    onAction,
    sortField,
    sortDirection,
    onSort,
    statusColors = {},
    permissions,
    entityPermissions,
    onRowClick
}: CrudTableProps) {
    const { t } = useTranslation();
    const renderSortIcon = (column: TableColumn) => {
        if (!column.sortable) return null;

        if (sortField === column.key) {
            return sortDirection === 'asc' ?
                <ChevronUp className="ml-1 h-4 w-4" /> :
                <ChevronDown className="ml-1 h-4 w-4" />;
        }

        return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />;
    };

    const handleSort = (column: TableColumn) => {
        if (!column.sortable || !onSort) return;
        onSort(column.key);
    };

    const isActionAllowed = (action: TableAction, row?: any) => {
        const permissionKey =
            action.requiredPermission ||
            action.permission ||
            (entityPermissions &&
                ((action.action === 'view' || action.action === 'view-details' || action.action === 'company-info')
                    ? entityPermissions.view
                    : action.action === 'edit'
                        ? entityPermissions.edit
                        : action.action === 'delete'
                            ? entityPermissions.delete
                            : action.permission));

        if (permissionKey && !hasPermission(permissions, permissionKey)) {
            return false;
        }

        if (row && action.condition && !action.condition(row)) {
            return false;
        }

        return true;
    };

    // Check if any actions have permissions
    const hasAnyActionPermission = actions.some((action) => isActionAllowed(action));

    const renderActionButtons = (row: any) => {
        return (
            <div className="flex items-center justify-end space-x-2">
                {actions.map((action, index) => {
                    if (!isActionAllowed(action, row)) {
                        return null;
                    }

                    const IconComponent = (LucidIcons as any)[action.icon] as React.ElementType;

                    // Handle link actions
                    if (action.href) {
                        const href = typeof action.href === 'function'
                            ? action.href(row)
                            : action.href.replace(':id', row.id);

                        return (
                            <TooltipProvider key={index}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link href={href} target={action.openInNewTab ? '_blank' : undefined}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn("h-8 w-8 text-gray-500")}
                                            >
                                                <IconComponent size={16} />
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{action.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    // Handle regular action buttons
                    return (
                        <TooltipProvider key={index}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("h-8 w-8 text-gray-500")}
                                        onClick={() => onAction(action.action, row)}
                                    >
                                        <IconComponent size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{action.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>
        );
    };

    // Helper function to get nested property value using dot notation
    const getNestedValue = (obj: any, path: string) => {
        if (!obj || !path) return null;

        const keys = path.split('.');
        return keys.reduce((acc, key) => {
            return acc && acc[key] !== undefined ? acc[key] : null;
        }, obj);
    };

    const renderCellContent = (row: any, col: TableColumn) => {
        // Get value using dot notation for nested properties
        const value = getNestedValue(row, col.key);

        // If column has custom render function, use it
        if (col.render) {
            return col.render(value, row);
        }

        // Handle different column types
        switch (col.type) {
            case 'badge':
                return (
                    <Badge className={cn("capitalize", statusColors[value])}>
                        {value}
                    </Badge>
                );

            case 'image':
                if (!value) {
                    return <div className="text-center text-gray-400">{t("No image")}</div>;
                }
                return (
                    <div className="flex justify-center">
                        <img
                            src={value.startsWith && value.startsWith('http')
                                ? value
                                : `/storage/${value}`}
                            alt={row.name || 'Image'}
                            className={col.className || "h-16 w-20 rounded-md object-cover shadow-sm"}
                            onError={(e) => {
                                e.currentTarget.src = 'https://placehold.co/200x150?text=Image+Not+Found';
                            }}
                        />
                    </div>
                );

            case 'date':
                return (
                    <div className="flex items-center gap-2 whitespace-nowrap text-gray-500">
                        {value && <LucidIcons.Calendar className="h-4 w-4" />}
                        <span>{window.appSettings?.formatDateTime(value, false) || '-'}</span>
                    </div>
                );

            case 'currency':
                return <span className="text-sm">{typeof value === 'number' ?
                    value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) :
                    value}</span>;

            case 'boolean':
                return <span className="text-sm">{value ? 'Yes' : 'No'}</span>;

            case 'link':
                if (!value) return <span>-</span>;

                const href = col.href
                    ? (typeof col.href === 'function' ? col.href(row) : col.href.replace(':id', row.id))
                    : '#';

                return (
                    <Link
                        href={href}
                        className={col.linkClassName || "text-blue-600 hover:underline"}
                        target={col.openInNewTab ? '_blank' : undefined}
                    >
                        {value}
                    </Link>
                );

            default:
                return <span className="text-sm font-medium">{value || '-'}</span>;
        }
    };

    return (
        <div className="border-collapse dark:bg-gray-900">
            <Table>
                <TableHeader>
                    <TableRow className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                        <TableHead className="w-12 py-2.5 font-semibold">#</TableHead>
                        {columns.map((column) => (
                            <TableHead
                                key={column.key}
                                className={cn(
                                    "py-2.5 font-semibold",
                                    column.sortable && "cursor-pointer select-none",
                                    column.className
                                )}
                                onClick={() => handleSort(column)}
                            >
                                <div className="flex items-center">
                                    {column.label}
                                    {renderSortIcon(column)}
                                </div>
                            </TableHead>
                        ))}
                        {hasAnyActionPermission && <TableHead className="w-24 py-2.5 text-center font-semibold">{t('Actions')}</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? (
                        data.map((row, index) => {
                            const defaultViewAction = !onRowClick
                                ? actions.find((a) => (a.action === 'view' || a.action === 'view-details' || a.action === 'company-info') && isActionAllowed(a, row))
                                : null;
                            const isRowClickable = Boolean(onRowClick || defaultViewAction);

                            return (
                                <TableRow
                                    key={row.id || index}
                                    className={cn(
                                        "hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 border-b transition-colors",
                                        isRowClickable && "cursor-pointer"
                                    )}
                                    onClick={(e) => {
                                        if (!isRowClickable) return;
                                        const target = e.target as HTMLElement;
                                        if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                            return;
                                        }
                                        const selection = window.getSelection();
                                        if (selection && selection.toString().trim().length > 0) {
                                            return;
                                        }
                                        if (onRowClick) {
                                            onRowClick(row, e);
                                            return;
                                        }
                                        if (defaultViewAction) {
                                            if (defaultViewAction.href) {
                                                const href = typeof defaultViewAction.href === 'function'
                                                    ? defaultViewAction.href(row)
                                                    : defaultViewAction.href.replace(':id', row.id);
                                                if (e.metaKey || e.ctrlKey) {
                                                    window.open(href, '_blank');
                                                } else {
                                                    router.visit(href);
                                                }
                                            } else if (defaultViewAction.action) {
                                                onAction(defaultViewAction.action, row);
                                            }
                                        }
                                    }}
                                >
                                    <TableCell className="font-medium py-2.5">{from + index}</TableCell>
                                {columns.map((col) => (
                                    <TableCell
                                        key={col.key}
                                        className={cn(
                                            "py-2.5",
                                            col.className
                                        )}
                                    >
                                        {renderCellContent(row, col)}
                                    </TableCell>
                                ))}
                                {hasAnyActionPermission && (
                                    <TableCell
                                        className="py-2.5 text-right"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {renderActionButtons(row)}
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length + (hasAnyActionPermission ? 2 : 1)}
                                className="text-muted-foreground h-24 text-center dark:text-gray-400"
                            >
                                {t('No results found.')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
