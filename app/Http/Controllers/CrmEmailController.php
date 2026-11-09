<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Contact;
use App\Models\CrmEmail;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Services\GoogleMailService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CrmEmailController extends Controller
{
    protected GoogleMailService $googleMailService;

    public function __construct(GoogleMailService $googleMailService)
    {
        $this->googleMailService = $googleMailService;
    }

    /**
     * Display unified CRM mailbox
     */
    public function index(Request $request): Response
    {
        $user = auth()->user();
        if (!$user) {
            abort(401);
        }

        $userType = $user->type ?? '';
        $isSuperAdmin = $userType === 'superadmin' || $user->hasRole('superadmin');
        $isCompany = in_array($userType, ['company', 'admin']) || $user->hasRole('company') || $user->hasRole('admin');
        $canManageEmails = $user->can('manage-emails');
        $canViewEmails = $user->can('view-emails');
        $canViewAllEmails = $user->can('view-all-emails') || $user->can('manage-all-emails');

        // Permission check: except admin (superadmin or company) or according to given permission
        if (!$isSuperAdmin && !$isCompany && !$canManageEmails && !$canViewEmails && !$canViewAllEmails) {
            abort(403, __('You do not have permission to access Email and Mailbox.'));
        }

        $tenantId = createdBy();

        // Purge any residual disconnected data so ONLY connected account data can EVER be visible
        $this->googleMailService->purgeDisconnectedData($tenantId);

        $userAccount = $this->googleMailService->resolveGoogleAccount($user->id);
        $userGoogleEmail = strtolower($userAccount['email'] ?? '');
        $canViewAll = $isSuperAdmin || $isCompany || $canViewAllEmails;

        // Auto-sync recent emails if connected and last sync was more than 2 minutes ago
        if (!empty($userAccount)) {
            $lastSync = \App\Models\Setting::where('user_id', $userAccount['user_id'])->where('key', 'googleMailLastSyncAt')->value('value');
            if (!$lastSync || \Carbon\Carbon::parse($lastSync)->diffInMinutes(now()) >= 2) {
                try {
                    $this->googleMailService->syncEmails($userAccount['user_id'], 300);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Mailbox auto-sync notice: ' . $e->getMessage());
                }
            }
        }

        $direction = $request->get('direction', 'all');
        $entityType = $request->get('entity_type', 'all');
        $search = trim($request->get('search', ''));
        $selectedId = $request->get('selected_id');

        $applyVisibilityScope = function ($q) use ($isSuperAdmin, $canViewAll, $user, $userAccount, $userGoogleEmail, $tenantId) {
            $connectedUserIds = $this->googleMailService->getConnectedUserIds($tenantId);

            if (!$canViewAll) {
                // Team members: MUST be actively connected to see their mailbox
                if (empty($userAccount) || !in_array($user->id, $connectedUserIds)) {
                    $q->whereRaw('1 = 0');
                    return;
                }

                // Team members can ONLY see their own Email and Mailbox
                $q->where('user_id', $user->id);
                if (!empty($userGoogleEmail)) {
                    $q->where(function ($sub) use ($user, $userGoogleEmail) {
                        $sub->where('user_id', $user->id)
                            ->orWhere('from_email', $userGoogleEmail)
                            ->orWhereJsonContains('to_emails', $userGoogleEmail)
                            ->orWhereJsonContains('cc_emails', $userGoogleEmail);
                    });
                }
            } else {
                // Admin (company/superadmin) or team leader with view-all permission:
                // ONLY emails from CURRENTLY CONNECTED user accounts should be visible!
                if (empty($connectedUserIds)) {
                    $q->whereRaw('1 = 0');
                    return;
                }

                $q->whereIn('user_id', $connectedUserIds);
                if (!$isSuperAdmin) {
                    $q->where(function ($sub) use ($tenantId, $connectedUserIds) {
                        $sub->where('created_by', $tenantId)
                            ->orWhereIn('user_id', $connectedUserIds);
                    });
                }
            }
        };

        $query = CrmEmail::query()
            ->with([
                'lead:id,name,email',
                'contact:id,name,email',
                'account:id,name,email',
                'opportunity:id,name',
                'user:id,name',
            ]);

        // Apply visibility scoping
        $applyVisibilityScope($query);

        // Direction filter
        if ($direction === 'inbound') {
            $query->where('direction', 'inbound');
        } elseif ($direction === 'outbound') {
            $query->where('direction', 'outbound');
        }

        // Entity type filter
        if ($entityType === 'lead') {
            $query->whereNotNull('lead_id');
        } elseif ($entityType === 'contact') {
            $query->whereNotNull('contact_id');
        } elseif ($entityType === 'account') {
            $query->whereNotNull('account_id');
        } elseif ($entityType === 'opportunity') {
            $query->whereNotNull('opportunity_id');
        } elseif ($entityType === 'unlinked') {
            $query->whereNull('lead_id')
                ->whereNull('contact_id')
                ->whereNull('account_id')
                ->whereNull('opportunity_id');
        }

        // Search filter
        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('from_email', 'like', "%{$search}%")
                    ->orWhere('from_name', 'like', "%{$search}%")
                    ->orWhere('snippet', 'like', "%{$search}%")
                    ->orWhere('body_text', 'like', "%{$search}%");
            });
        }

        $emails = $query->orderBy('sent_at', 'desc')
            ->paginate(25)
            ->withQueryString();

        // Calculate count badges based on the same scoped query
        $baseCountQuery = CrmEmail::query();
        $applyVisibilityScope($baseCountQuery);

        $counts = [
            'total' => (clone $baseCountQuery)->count(),
            'inbound' => (clone $baseCountQuery)->where('direction', 'inbound')->count(),
            'outbound' => (clone $baseCountQuery)->where('direction', 'outbound')->count(),
            'leads' => (clone $baseCountQuery)->whereNotNull('lead_id')->count(),
            'contacts' => (clone $baseCountQuery)->whereNotNull('contact_id')->count(),
            'accounts' => (clone $baseCountQuery)->whereNotNull('account_id')->count(),
            'opportunities' => (clone $baseCountQuery)->whereNotNull('opportunity_id')->count(),
            'unlinked' => (clone $baseCountQuery)
                ->whereNull('lead_id')
                ->whereNull('contact_id')
                ->whereNull('account_id')
                ->whereNull('opportunity_id')
                ->count(),
        ];

        // Google Mail connection status for THIS specific logged-in user
        $googleSummary = $this->googleMailService->getStatusSummary($user->id);
        $isConnected = $googleSummary['isConnected'];
        $connectedEmail = $googleSummary['connectedEmail'] ?: '';
        $connectedName = $googleSummary['connectedName'] ?: '';
        $lastSyncAt = $googleSummary['lastSyncAt'];

        // Recent CRM entities for compose entity selector
        $recentLeads = Lead::where('created_by', $tenantId)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->select('id', 'name', 'email')
            ->latest()
            ->limit(100)
            ->get();

        $recentContacts = Contact::where('created_by', $tenantId)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->select('id', 'name', 'email')
            ->latest()
            ->limit(100)
            ->get();

        $recentAccounts = Account::where('created_by', $tenantId)
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->select('id', 'name', 'email')
            ->latest()
            ->limit(100)
            ->get();

        $recentOpportunities = Opportunity::where('created_by', $tenantId)
            ->select('id', 'name', 'contact_id', 'account_id')
            ->with(['contact:id,name,email', 'account:id,name,email'])
            ->latest()
            ->limit(100)
            ->get();

        return Inertia::render('emails/index', [
            'emails' => $emails,
            'counts' => $counts,
            'filters' => [
                'direction' => $direction,
                'entity_type' => $entityType,
                'search' => $search,
                'selected_id' => $selectedId,
            ],
            'googleMail' => [
                'isConnected' => $isConnected,
                'connectedEmail' => $connectedEmail,
                'connectedName' => $connectedName,
                'lastSyncAt' => $lastSyncAt,
            ],
            'availableEntities' => [
                'leads' => $recentLeads,
                'contacts' => $recentContacts,
                'accounts' => $recentAccounts,
                'opportunities' => $recentOpportunities,
            ],
        ]);
    }

    /**
     * Delete an email record
     */
    public function destroy($id)
    {
        $user = auth()->user();
        if (!$user) {
            abort(401);
        }

        $userType = $user->type ?? '';
        $isSuperAdmin = $userType === 'superadmin' || $user->hasRole('superadmin');
        $isCompany = in_array($userType, ['company', 'admin']) || $user->hasRole('company') || $user->hasRole('admin');
        $canDelete = $isSuperAdmin || $isCompany || $user->can('delete-emails') || $user->can('manage-emails');

        if (!$canDelete) {
            abort(403, __('You do not have permission to delete emails.'));
        }

        $tenantId = createdBy();
        $query = CrmEmail::query();
        if (!$isSuperAdmin) {
            if ($isCompany || $user->can('view-all-emails')) {
                $query->where('created_by', $tenantId);
            } else {
                $query->where('user_id', $user->id);
            }
        }

        $email = $query->findOrFail($id);
        $email->delete();

        return redirect()->back()->with('success', __('Email deleted successfully.'));
    }
}
