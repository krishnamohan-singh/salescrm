import { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnMappingModal } from './ColumnMappingModal';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  importRoute: string;
  parseRoute: string;
  samplePath?: string;
  importNotes: string;
  databaseFields: { key: string; required?: boolean }[];
  users?: { id: number; name: string; email?: string }[];
}

export function ImportModal({
  isOpen,
  onClose,
  title,
  importRoute,
  parseRoute,
  samplePath,
  importNotes,
  databaseFields,
  users
}: ImportModalProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error(t('Please select a file to import'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsImporting(true);
    toast.loading(t('Parsing file...'));

    try {
      const { data } = await axios.post(route(parseRoute), formData);

      if (data.excelColumns && data.previewData) {
        setExcelColumns(data.excelColumns);
        setParsedData(data.previewData);
        setPreviewData(data.previewData || []);
        toast.dismiss();
        onClose();
        setShowMappingModal(true);
      } else {
        toast.dismiss();
        toast.error(data.message || t('Failed to parse file'));
      }
    } catch (error: any) {
      toast.dismiss();
      const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
      toast.error(serverMsg || t('Network error or invalid response'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleMappingClose = () => {
    setShowMappingModal(false);
    setFile(null);
    setAssignedTo('');
    setExcelColumns([]);
    setParsedData([]);
    setPreviewData([]);
  };

  const handleClose = () => {
    if (!isImporting && !showMappingModal) {
      setFile(null);
      setAssignedTo('');
      onClose();
    }
  };


  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {samplePath && (
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch(samplePath);
                    if (!response.ok) {
                      const error = await response.json();
                      toast.error(t(error.error || 'Failed to download template'));
                      return;
                    }
                    window.location.href = samplePath;
                  } catch (error) {
                    toast.error(t('Failed to download template'));
                  }
                }}
                disabled={!samplePath}
                className="mb-4"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('Download Template')}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file" required>{t('Select File')}</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={isImporting}
              required
            />
          </div>

          {users && users.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="import_assigned_to">{t('Assign to Sales User')}</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="import_assigned_to" className="w-full">
                  <SelectValue placeholder={t('Select user to assign (optional)')} />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  <SelectItem value="__none__">{t('None (Default to current user / CSV)')}</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name} {u.email ? `(${u.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('All successfully imported leads will be assigned to this user.')}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-2">{t('Import Notes:')}</h4>
            <p className="text-xs text-blue-700">{importNotes}</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isImporting}>
            {t('Cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isImporting}>
            {t('Import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ColumnMappingModal
      isOpen={showMappingModal}
      onClose={handleMappingClose}
      excelColumns={excelColumns}
      databaseFields={databaseFields}
      importRoute={importRoute}
      data={parsedData}
      previewData={previewData}
      assignedTo={assignedTo !== '__none__' ? assignedTo : undefined}
      assignedUserName={users?.find(u => u.id.toString() === assignedTo)?.name}
      title={title}
    />
    </>
  );
}
