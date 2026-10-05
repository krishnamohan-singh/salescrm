import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { NotebookPen, User, Share2, Users } from 'lucide-react';

interface ViewProps {
    record: any;
}

export default function View({ record }: ViewProps) {
    const { t } = useTranslation();

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <NotebookPen className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">{t('Note Details')}</DialogTitle>
                </div>
            </DialogHeader>

            <div className="px-6 py-4 pb-6 space-y-4">
                {/* Title & Created By */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <NotebookPen className="h-4 w-4" />
                            {t('Title')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.title || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('Created By')}
                        </label>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{record.creator?.name || '-'}</p>
                    </div>
                </div>

                {/* Shared With */}
                {record.shared_users?.length > 0 && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Share2 className="h-4 w-4" />
                            {t('Shared With')}
                        </label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {record.shared_users.map((user: any) => (
                                <span key={user.id} className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                    <Users className="h-3 w-3" />
                                    {user.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div>
                    <label className="text-sm font-medium text-gray-500">{t('Content')}</label>
                    <div
                        className="mt-2 text-sm text-gray-900 dark:text-white prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: record.content || t('No content') }}
                    />
                </div>
            </div>
        </DialogContent>
    );
}
