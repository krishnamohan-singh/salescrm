<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountIndustry;
use App\Models\Lead;
use App\Models\LeadIntegration;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\User;
use App\Services\LeadIntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LeadIntegrationApiController extends Controller
{
    /**
     * Handle incoming Facebook Lead Ads webhook
     */
    public function facebookWebhook(Request $request, string $token, LeadIntegrationService $service): Response|JsonResponse
    {
        $integration = LeadIntegration::where('webhook_token', $token)
            ->where('type', 'facebook')
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'Integration endpoint not found.'], 404);
        }

        $result = $service->handleFacebook($integration, $request);

        if (!empty($result['is_challenge'])) {
            if (!empty($result['challenge'])) {
                return response($result['challenge'], 200)->header('Content-Type', 'text/plain');
            }
            return response()->json(['error' => $result['error'] ?? 'Challenge failed'], $result['status'] ?? 403);
        }

        return response()->json($result, $result['status'] ?? 200);
    }

    /**
     * Handle incoming Google Ads Lead Form webhook
     */
    public function googleAdsWebhook(Request $request, string $token, LeadIntegrationService $service): JsonResponse
    {
        $integration = LeadIntegration::where('webhook_token', $token)
            ->where('type', 'google_ads')
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'Integration endpoint not found.'], 404);
        }

        $result = $service->handleGoogleAds($integration, $request);

        return response()->json($result, $result['status'] ?? 200);
    }

    /**
     * Handle custom incoming Webhook
     */
    public function customWebhook(Request $request, string $token, LeadIntegrationService $service): JsonResponse
    {
        $integration = LeadIntegration::where('webhook_token', $token)
            ->where('type', 'webhook')
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'Integration endpoint not found.'], 404);
        }

        $result = $service->handleWebhook($integration, $request);

        return response()->json($result, $result['status'] ?? 200);
    }

    /**
     * REST API: Create Lead
     */
    public function createLead(Request $request, LeadIntegrationService $service): JsonResponse
    {
        $integration = $this->authenticateApiKey($request);
        if (!$integration) {
            return response()->json(['error' => 'Unauthorized: Invalid or missing API Key.'], 401);
        }

        $result = $service->handleApi($integration, $request);

        return response()->json($result, $result['status'] ?? 200);
    }

    /**
     * REST API: List Leads
     */
    public function listLeads(Request $request): JsonResponse
    {
        $integration = $this->authenticateApiKey($request);
        if (!$integration) {
            return response()->json(['error' => 'Unauthorized: Invalid or missing API Key.'], 401);
        }

        $companyId = $integration->created_by;
        $query = Lead::where('created_by', $companyId)
            ->with(['leadStatus:id,name,color', 'leadSource:id,name', 'assignedUser:id,name,email', 'accountIndustry:id,name']);

        if ($request->has('search') && !empty($request->search)) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('company', 'like', "%{$s}%");
            });
        }

        if ($request->has('lead_status_id') && !empty($request->lead_status_id)) {
            $query->where('lead_status_id', $request->lead_status_id);
        }

        if ($request->has('lead_source_id') && !empty($request->lead_source_id)) {
            $query->where('lead_source_id', $request->lead_source_id);
        }

        $perPage = max(1, min(100, (int)$request->input('per_page', 20)));
        $leads = $query->latest('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $leads->items(),
            'meta'    => [
                'current_page' => $leads->currentPage(),
                'last_page'    => $leads->lastPage(),
                'per_page'     => $leads->perPage(),
                'total'        => $leads->total(),
            ],
        ]);
    }

    /**
     * REST API: Get single Lead
     */
    public function getLead(Request $request, int $id): JsonResponse
    {
        $integration = $this->authenticateApiKey($request);
        if (!$integration) {
            return response()->json(['error' => 'Unauthorized: Invalid or missing API Key.'], 401);
        }

        $companyId = $integration->created_by;
        $lead = Lead::where('created_by', $companyId)
            ->with(['leadStatus:id,name,color', 'leadSource:id,name', 'assignedUser:id,name,email', 'accountIndustry:id,name', 'activities'])
            ->find($id);

        if (!$lead) {
            return response()->json(['error' => 'Lead not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'lead'    => $lead,
        ]);
    }

    /**
     * REST API: Get metadata (Statuses, Sources, Industries, Assignable Users)
     */
    public function getMetadata(Request $request): JsonResponse
    {
        $integration = $this->authenticateApiKey($request);
        if (!$integration) {
            return response()->json(['error' => 'Unauthorized: Invalid or missing API Key.'], 401);
        }

        $companyId = $integration->created_by;

        $statuses = LeadStatus::where('created_by', $companyId)->where('status', 'active')->get(['id', 'name', 'color']);
        $sources = LeadSource::where('created_by', $companyId)->where('status', 'active')->get(['id', 'name']);
        $industries = AccountIndustry::where('created_by', $companyId)->where('status', 'active')->get(['id', 'name']);
        $users = User::where(function ($q) use ($companyId) {
            $q->where('id', $companyId)->orWhere('created_by', $companyId);
        })->where('status', 'active')->get(['id', 'name', 'email']);

        return response()->json([
            'success'    => true,
            'statuses'   => $statuses,
            'sources'    => $sources,
            'industries' => $industries,
            'users'      => $users,
        ]);
    }

    /**
     * Authenticate request using Bearer Token or X-API-Key
     */
    protected function authenticateApiKey(Request $request): ?LeadIntegration
    {
        $apiKey = $request->bearerToken();
        if (empty($apiKey)) {
            $apiKey = $request->header('X-API-Key') ?? $request->header('x-api-key') ?? $request->query('api_key');
        }

        if (empty($apiKey)) {
            return null;
        }

        return LeadIntegration::where('api_key', $apiKey)
            ->where('type', 'api')
            ->where('is_active', true)
            ->first();
    }
}
