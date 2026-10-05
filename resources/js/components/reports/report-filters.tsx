import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { DatePicker } from '@/components/ui/date-picker';

interface ReportFiltersProps {
    filters: {
        dateFrom: string;
        dateTo: string;
        [key: string]: any;
    };
    additionalFilters?: ReactNode;
}

import { ReactNode } from 'react';

export function ReportFilters({ filters, additionalFilters }: ReportFiltersProps) {
    const { t } = useTranslation();
    const [dateFrom, setDateFrom] = useState(filters.dateFrom);
    const [dateTo, setDateTo] = useState(filters.dateTo);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(window.location.pathname, {
            date_from: dateFrom,
            date_to: dateTo,
        });
    };

    const handleClearFilters = () => {
        const defaultDateFrom = new Date();
        defaultDateFrom.setMonth(defaultDateFrom.getMonth() - 1);
        const defaultDateTo = new Date();

        setDateFrom(defaultDateFrom.toISOString().split('T')[0]);
        setDateTo(defaultDateTo.toISOString().split('T')[0]);

        router.get(window.location.pathname);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
            <form onSubmit={handleFilterSubmit} className="flex items-center gap-2 p-3">
                <div className="flex flex-1 items-center gap-2 w-full">
                    <div className="flex flex-1 items-center gap-2">
                        <p className="text-sm font-medium shrink-0">{t('From Date :')}</p>
                        <div className="flex-1" style={{ minWidth: 0 }}>
                            <DatePicker
                                id="date_from"
                                selected={dateFrom}
                                onChange={(e) => setDateFrom(e)}
                                placeholder={t('From Date')}
                                className="!w-full"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                        <p className="text-sm font-medium shrink-0">{t('To Date :')}</p>
                        <div className="flex-1" style={{ minWidth: 0 }}>
                            <DatePicker
                                id="date_to"
                                selected={dateTo}
                                onChange={(e) => setDateTo(e)}
                                placeholder={t('To Date')}
                                className="!w-full"
                                required
                            />
                        </div>
                    </div>
                    {additionalFilters}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button type="submit" size="sm" className="h-9">{t('Apply Filters')}</Button>
                    <Button type="button" size="sm" className="h-9" variant="outline" onClick={handleClearFilters}>{t('Clear Filters')}</Button>
                </div>
            </form>
        </div>
    );
}
