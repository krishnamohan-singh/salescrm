<?php

namespace App\Http\Controllers;

use App\Services\GoogleCalendarService;
use App\Models\Setting;
use Illuminate\Http\Request;

class GoogleCalendarController extends Controller
{
    protected $calendarService;

    public function __construct(GoogleCalendarService $calendarService)
    {
        $this->calendarService = $calendarService;
    }

    public function getEvents(Request $request)
    {
        try {
            $userId = auth()->id() ?: createdBy();
            $events = $this->calendarService->getEvents(
                $userId,
                $request->get('maxResults', 100)
            );

            return response()->json([
                'success' => true,
                'events' => $events
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'events' => []
            ]);
        }
    }

    public function syncEvents(Request $request)
    {
        try {
            $userId = auth()->id() ?: createdBy();
            $isEnabled = $this->calendarService->isEnabled($userId);
            $isAuthorized = $this->calendarService->isAuthorized($userId);

            \Log::info('Google Calendar sync check', [
                'user_id' => $userId,
                'isEnabled' => $isEnabled,
                'isAuthorized' => $isAuthorized
            ]);

            if (!$isEnabled || !$isAuthorized) {
                return response()->json([
                    'success' => false,
                    'message' => __('Google Calendar is not configured. Please configure Google Calendar settings or connect your Google account.'),
                    'needsConfig' => true
                ]);
            }

            $events = $this->calendarService->getEvents($userId, 100);

            return response()->json([
                'success' => true,
                'message' => __('Calendar events synchronized successfully'),
                'events' => $events
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('Failed to sync calendar events: ') . $e->getMessage()
            ]);
        }
    }

    public function checkStatus()
    {
        try {
            $userId = auth()->id() ?: createdBy();
            $isEnabled = $this->calendarService->isEnabled($userId);
            $isAuthorized = $this->calendarService->isAuthorized($userId);

            return response()->json([
                'success' => true,
                'enabled' => $isEnabled,
                'authorized' => $isAuthorized
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
}
