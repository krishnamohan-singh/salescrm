import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SettingsSection } from '@/components/settings-section';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
  Inbox,
  ShieldAlert,
  Sliders,
  Key,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { hasRole } from '@/utils/authorization';

interface GoogleMailSettingsProps {
  settings?: Record<string, any>;
}

export default function GoogleMailSettings({ settings = {} }: GoogleMailSettingsProps) {
  const { t } = useTranslation();
  const pageProps = usePage().props as any;
  const auth = pageProps.auth || {};

  // Check if current user is Super Admin
  const isSuperAdmin = hasRole(auth?.roles, 'superadmin') || auth?.user?.type === 'superadmin';

  const isConnected = settings.googleMailConnected === '1' || settings.googleMailConnected === true;
  const connectedEmail = settings.googleMailConnectedEmail || '';
  const connectedName = settings.googleMailConnectedName || '';
  const lastSyncAt = settings.googleMailLastSyncAt || null;

  const [formData, setFormData] = useState({
    googleMailEnabled: settings.googleMailEnabled === '1' || settings.googleMailEnabled === true || isConnected,
    googleMailClientId: settings.googleMailClientId || '',
    googleMailClientSecret: settings.googleMailClientSecret || '',
    googleMailCaptureInbound: settings.googleMailCaptureInbound !== '0',
    googleMailCaptureOutbound: settings.googleMailCaptureOutbound !== '0',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if Google OAuth Client ID & Secret are configured system-wide
  const isOAuthCredentialsConfigured = Boolean(
    (formData.googleMailClientId && formData.googleMailClientSecret) ||
    settings.googleOAuthGlobalConfigured
  );

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/integrations/google-mail/callback`
    : '/integrations/google-mail/callback';

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    toast.success(t('Redirect URI copied to clipboard!'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    router.post(route('settings.google-mail.update'), formData, {
      preserveScroll: true,
      onSuccess: () => {
        setIsSaving(false);
        toast.success(t('Google Mail settings saved successfully.'));
      },
      onError: (errors) => {
        setIsSaving(false);
        const msg = errors.error || Object.values(errors)[0] || t('Failed to save settings');
        toast.error(String(msg));
      },
    });
  };

  const handleConnect = () => {
    if (!isOAuthCredentialsConfigured) {
      toast.error(
        isSuperAdmin
          ? t('Please enter and save your Google Client ID and Secret first.')
          : t('Google OAuth credentials have not been configured yet by the system administrator. Please contact your Super Admin.')
      );
      return;
    }
    window.location.href = route('google-mail.connect');
  };

  const handleDisconnect = () => {
    if (confirm(t('Are you sure you want to disconnect this Google account? All synced emails and mailbox data for this account will be removed.'))) {
      router.post(route('google-mail.disconnect'), {}, {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(t('Google account disconnected successfully.'));
        },
      });
    }
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    router.post(route('google-mail.sync'), { limit: 200 }, {
      preserveScroll: true,
      onSuccess: (page: any) => {
        setIsSyncing(false);
        const flashMsg = page.props?.flash?.success || t('Gmail sync completed.');
        toast.success(flashMsg);
      },
      onError: (err: any) => {
        setIsSyncing(false);
        toast.error(err.error || t('Gmail sync encountered an error.'));
      },
    });
  };

  const handleSimulateTestEmail = (direction: 'inbound' | 'outbound') => {
    setIsTesting(true);
    router.post(route('google-mail.test-sync'), {
      direction,
      subject: direction === 'inbound'
        ? t('Demo: Follow-up on pricing proposal')
        : t('Demo: Introduction & Product Catalogue overview'),
      body: direction === 'inbound'
        ? t('Hello! We reviewed your proposal and are excited to move forward with the CRM implementation. Could we schedule a brief onboarding call?')
        : t('Thank you for connecting with us today! Attached please find our product catalogue and service contract for your review.'),
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsTesting(false);
        toast.success(t('Captured demo {{direction}} email into CRM timeline!', { direction }));
      },
      onError: () => {
        setIsTesting(false);
        toast.error(t('Failed to create test email'));
      },
    });
  };

  return (
    <SettingsSection
      title={isSuperAdmin ? t('Google OAuth 2.0 & Mail Integration (Global)') : t('Google Workspace / Gmail Integration')}
      description={
        isSuperAdmin
          ? t('Configure system-wide Google OAuth 2.0 Credentials (Client ID & Client Secret) used across all company workspaces.')
          : t('Connect your Google Workspace or Gmail account to automatically log incoming & outgoing emails directly into CRM timelines.')
      }
    >
      <div className="space-y-6">

        {/* ── 1. Connection Card (Visible to BOTH Company and Super Admin) ────── */}
        <Card className="border border-border/70 shadow-sm overflow-hidden">
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 border-b border-border">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-base">Google Workspace / Gmail</h3>
                  {isConnected ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-xs py-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t('Connected')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground gap-1 text-xs py-0.5">
                      {t('Not Connected')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isConnected
                    ? t('Connected as {{email}}', { email: connectedEmail || connectedName })
                    : t('Connect your Google account to log emails directly under Leads, Contacts, and Accounts.')}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isConnected ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? t('Syncing...') : t('Sync Emails Now')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                  >
                    {t('Disconnect')}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnect}
                  disabled={!isOAuthCredentialsConfigured && !isSuperAdmin}
                  className="bg-primary gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {t('Connect with Google')}
                </Button>
              )}
            </div>
          </div>

          {/* Sync Stats Banner */}
          {isConnected && (
            <div className="px-5 py-3 bg-muted/10 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {t('Two-way email sync active: Inbox & Sent items matched to CRM contacts.')}
              </span>
              <span>
                {lastSyncAt ? t('Last synced: {{time}}', { time: new Date(lastSyncAt).toLocaleString() }) : t('Not synced yet')}
              </span>
            </div>
          )}

          {/* Alert for Company when Super Admin has not set credentials yet */}
          {!isConnected && !isSuperAdmin && !isOAuthCredentialsConfigured && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900/30">
              <div className="flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold">{t('Google OAuth Credentials Pending')}</p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400/90">
                    {t('Google integration has not been configured yet by the system administrator. Once the Super Admin configures the global Google Client ID and Secret, you will be able to connect your Google account with one click.')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── 2. Super Admin ONLY: "Google OAuth 2.0 Credentials" Form ─────── */}
        {isSuperAdmin && (
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base font-semibold">{t('Google OAuth 2.0 Credentials')}</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {t('Configure your Google Cloud API Console OAuth Client ID & Secret. These credentials are used globally across all companies to authorize Gmail access.')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                  {t('Super Admin Setup')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmitSettings} className="space-y-4">

                {/* Redirect URI copy box */}
                <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                      {t('Authorized Redirect URI (Add to Google Cloud Console)')}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyUri}
                      className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copied ? t('Copied') : t('Copy URI')}
                    </Button>
                  </div>
                  <code className="text-xs font-mono bg-background p-2 rounded border block text-muted-foreground break-all select-all">
                    {redirectUri}
                  </code>
                </div>

                {/* Client ID */}
                <div className="space-y-1.5">
                  <Label htmlFor="googleMailClientId" className="text-xs font-medium">
                    {t('Google Client ID')}
                  </Label>
                  <Input
                    id="googleMailClientId"
                    value={formData.googleMailClientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, googleMailClientId: e.target.value }))}
                    placeholder="e.g. 1234567890-abcdefgh.apps.googleusercontent.com"
                  />
                </div>

                {/* Client Secret */}
                <div className="space-y-1.5">
                  <Label htmlFor="googleMailClientSecret" className="text-xs font-medium">
                    {t('Google Client Secret')}
                  </Label>
                  <Input
                    id="googleMailClientSecret"
                    type="password"
                    value={formData.googleMailClientSecret}
                    onChange={(e) => setFormData(prev => ({ ...prev, googleMailClientSecret: e.target.value }))}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                {/* System Toggles */}
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium">{t('Auto-Capture Inbound Emails (Default)')}</Label>
                      <p className="text-xs text-muted-foreground">{t('Match incoming emails from Leads and Contacts to their Journey Timeline')}</p>
                    </div>
                    <Switch
                      checked={formData.googleMailCaptureInbound}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, googleMailCaptureInbound: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium">{t('Auto-Capture Outbound Emails (Default)')}</Label>
                      <p className="text-xs text-muted-foreground">{t('Log emails sent to Leads and Contacts into the CRM timeline')}</p>
                    </div>
                    <Switch
                      checked={formData.googleMailCaptureOutbound}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, googleMailCaptureOutbound: checked }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {isSaving ? t('Saving...') : t('Save OAuth Credentials')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── 3. Company Personal Sync Preferences (Company ONLY) ─────────── */}
        {!isSuperAdmin && (
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-muted/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-semibold">{t('Company Email Capture Preferences')}</CardTitle>
              </div>
              <CardDescription className="text-xs">
                {t('Configure how customer emails are automatically logged to CRM contact timelines for your team.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmitSettings} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium">{t('Auto-Capture Inbound Emails')}</Label>
                      <p className="text-xs text-muted-foreground">{t('Match incoming emails from Leads and Contacts to their Journey Timeline')}</p>
                    </div>
                    <Switch
                      checked={formData.googleMailCaptureInbound}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, googleMailCaptureInbound: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium">{t('Auto-Capture Outbound Emails')}</Label>
                      <p className="text-xs text-muted-foreground">{t('Log emails you send to Leads and Contacts into the CRM timeline')}</p>
                    </div>
                    <Switch
                      checked={formData.googleMailCaptureOutbound}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, googleMailCaptureOutbound: checked }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {isSaving ? t('Saving...') : t('Save Preferences')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── 4. HubSpot-style Instant Demo & Test Simulator ──────────────── */}
        <Card className="border border-border/70 shadow-sm bg-gradient-to-r from-blue-50/40 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-semibold">{t('Instant Timeline Capture Verification')}</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                {t('HubSpot-style')}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {t('Instantly simulate captured emails to verify how they appear on the Journey Timeline under Leads, Contacts, and Accounts.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTesting}
              onClick={() => handleSimulateTestEmail('inbound')}
              className="gap-2 bg-background"
            >
              <Inbox className="w-3.5 h-3.5 text-purple-600" />
              {t('Capture Inbound Email (Received 📥)')}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTesting}
              onClick={() => handleSimulateTestEmail('outbound')}
              className="gap-2 bg-background"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              {t('Capture Outbound Email (Sent 📤)')}
            </Button>
          </CardContent>
        </Card>

      </div>
    </SettingsSection>
  );
}
