<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use App\Models\Meeting;
use App\Models\Call;
use App\Models\Contact;
use App\Models\Lead;
use App\Services\GoogleMailService;
use Google_Client;
use Google_Service_Calendar;
use Google_Service_Calendar_Event;
use Google_Service_Calendar_EventDateTime;
use Google_Service_Calendar_EventAttendee;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    private $client;
    private $service;

    public function __construct()
    {
        $this->client = new Google_Client();
        $this->service = new Google_Service_Calendar($this->client);
    }

    /**
     * Check if Google Calendar integration is enabled
     */
    public function isEnabled($userId = null)
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());
        $tenantId = createdBy();
        $superAdmin = User::where('type', 'superadmin')->first();
        $superAdminId = $superAdmin ? $superAdmin->id : 1;

        // Check OAuth connected account
        $mailService = new GoogleMailService();
        if ($mailService->isConnected($targetUserId)) {
            return true;
        }

        // Check settings: target user -> tenant -> super admin
        $enabled = getSetting('googleCalendarEnabled', null, $targetUserId) === '1'
            || getSetting('googleCalendarEnabled', null, $tenantId) === '1'
            || getSetting('googleCalendarEnabled', null, $superAdminId) === '1';

        Log::info('Google Calendar enabled check', [
            'user_id' => $targetUserId,
            'enabled' => $enabled
        ]);

        return (bool) $enabled;
    }

    /**
     * Check if Google Calendar is authorized with valid credentials
     */
    public function isAuthorized($userId = null)
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());
        $tenantId = createdBy();
        $superAdmin = User::where('type', 'superadmin')->first();
        $superAdminId = $superAdmin ? $superAdmin->id : 1;

        // Check OAuth connected account
        $mailService = new GoogleMailService();
        if ($mailService->isConnected($targetUserId)) {
            return true;
        }

        // Check Service Account JSON
        $jsonPath = Setting::where('user_id', $targetUserId)->where('key', 'googleCalendarJsonPath')->value('value')
            ?: Setting::where('user_id', $tenantId)->where('key', 'googleCalendarJsonPath')->value('value')
            ?: Setting::where('user_id', $superAdminId)->where('key', 'googleCalendarJsonPath')->value('value');

        if (!$jsonPath) {
            return false;
        }

        $paths = [
            $jsonPath,
            storage_path('app/public/' . $jsonPath),
            storage_path('app/' . $jsonPath),
            storage_path($jsonPath),
            base_path($jsonPath),
            public_path('storage/' . $jsonPath),
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get Google Calendar ID (target user -> tenant -> super admin -> 'primary')
     */
    public function getCalendarId($userId = null)
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());

        // Check if user has personal OAuth connected
        $mailService = new GoogleMailService();
        if ($mailService->isConnected($targetUserId)) {
            return 'primary';
        }

        $tenantId = createdBy();
        $superAdmin = User::where('type', 'superadmin')->first();
        $superAdminId = $superAdmin ? $superAdmin->id : 1;

        $id = Setting::where('user_id', $targetUserId)->where('key', 'googleCalendarId')->value('value')
            ?: Setting::where('user_id', $tenantId)->where('key', 'googleCalendarId')->value('value')
            ?: Setting::where('user_id', $superAdminId)->where('key', 'googleCalendarId')->value('value');

        return (!empty($id) && trim($id) !== '') ? trim($id) : 'primary';
    }

    /**
     * Initialize Google client with user OAuth token or service account credentials
     */
    private function setupClient($userId = null)
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());

        // 1. Check if user has connected Google account via OAuth
        $mailService = new GoogleMailService();
        $account = $mailService->resolveGoogleAccount($targetUserId);
        if ($account && !empty($account['token'])) {
            try {
                $client = $mailService->getClient($targetUserId);
                $this->client = $client;
                $this->service = new Google_Service_Calendar($this->client);
                return;
            } catch (\Throwable $e) {
                Log::warning('Failed initializing Google Calendar with OAuth token, falling back to service account: ' . $e->getMessage());
            }
        }

        // 2. Service account JSON fallback (target user -> tenant -> super admin)
        $tenantId = createdBy();
        $superAdmin = User::where('type', 'superadmin')->first();
        $superAdminId = $superAdmin ? $superAdmin->id : 1;

        $jsonPath = Setting::where('user_id', $targetUserId)->where('key', 'googleCalendarJsonPath')->value('value')
            ?: Setting::where('user_id', $tenantId)->where('key', 'googleCalendarJsonPath')->value('value')
            ?: Setting::where('user_id', $superAdminId)->where('key', 'googleCalendarJsonPath')->value('value');

        if (!$jsonPath) {
            throw new \Exception('Google Calendar credentials not configured. Please configure credentials or connect your Google account.');
        }

        $paths = [
            $jsonPath,
            storage_path('app/public/' . $jsonPath),
            storage_path('app/' . $jsonPath),
            storage_path($jsonPath),
            base_path($jsonPath),
            public_path('storage/' . $jsonPath),
        ];

        $validPath = null;
        foreach ($paths as $path) {
            if (file_exists($path)) {
                $validPath = $path;
                break;
            }
        }

        if (!$validPath) {
            throw new \Exception('Google Calendar JSON file not found at: ' . $jsonPath);
        }

        $this->client = new Google_Client();
        $this->client->setAuthConfig($validPath);
        $this->client->setScopes([Google_Service_Calendar::CALENDAR]);
        $this->client->useApplicationDefaultCredentials();
        $this->service = new Google_Service_Calendar($this->client);
    }

    /**
     * Create event in Google Calendar with attendees (sales rep + participants)
     */
    public function createEvent($item, $userId = null, $type = 'meeting')
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());
        if (!$this->isEnabled($targetUserId)) {
            Log::info('Google Calendar not enabled', ['user_id' => $targetUserId]);
            return null;
        }

        try {
            Log::info('Creating Google Calendar event', ['user_id' => $targetUserId, 'type' => $type]);
            $this->setupClient($targetUserId);

            $summary = $item->title ?? 'Event';
            $description = $item->description ?? '';

            $event = new Google_Service_Calendar_Event([
                'summary' => $summary,
                'description' => $description,
                'location' => $item->location ?? '',
                'extendedProperties' => [
                    'private' => [
                        'app_type' => $type,
                        'app_id' => $item->id,
                        'app_user_id' => $targetUserId
                    ]
                ]
            ]);

            $userTimezone = getSetting('defaultTimezone', 'Asia/Kolkata', $targetUserId);

            if (($type === 'meeting' || $type === 'call') && $item->start_date) {
                $startDate = $item->start_date instanceof \Carbon\Carbon ? $item->start_date->format('Y-m-d') : $item->start_date;
                $endDate = $item->end_date instanceof \Carbon\Carbon ? $item->end_date->format('Y-m-d') : ($item->end_date ?: $startDate);
                $startTimeStr = $item->start_time instanceof \Carbon\Carbon ? $item->start_time->format('H:i:s') : ($item->start_time ?: '09:00:00');
                $endTimeStr = $item->end_time instanceof \Carbon\Carbon ? $item->end_time->format('H:i:s') : ($item->end_time ?: '10:00:00');

                $startTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $startDate . ' ' . $startTimeStr, $userTimezone);
                $endTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $endDate . ' ' . $endTimeStr, $userTimezone);
            } elseif ($type === 'task' && $item->due_date) {
                $dueDate = $item->due_date instanceof \Carbon\Carbon ? $item->due_date->format('Y-m-d') : $item->due_date;
                $startTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $dueDate . ' 09:00:00', $userTimezone);
                $endTime = $startTime->copy()->addHour();
            } else {
                return null;
            }

            $start = new Google_Service_Calendar_EventDateTime();
            $start->setDateTime($startTime->format('c'));
            $event->setStart($start);

            $end = new Google_Service_Calendar_EventDateTime();
            $end->setDateTime($endTime->format('c'));
            $event->setEnd($end);

            // Populate attendees list (Sales representative + Creator + Contacts/Leads)
            $attendeeList = [];
            $addedEmails = [];

            // 1. Assigned sales user
            if (!empty($item->assigned_to)) {
                $assignedUser = User::find($item->assigned_to);
                if ($assignedUser && !empty($assignedUser->email)) {
                    $attendeeList[] = new Google_Service_Calendar_EventAttendee([
                        'email' => $assignedUser->email,
                        'displayName' => $assignedUser->name,
                        'responseStatus' => 'accepted',
                    ]);
                    $addedEmails[] = strtolower(trim($assignedUser->email));
                }
            }

            // 2. Creator user
            $creatorId = $item->created_by ?: $targetUserId;
            if (!empty($creatorId)) {
                $creator = User::find($creatorId);
                if ($creator && !empty($creator->email) && !in_array(strtolower(trim($creator->email)), $addedEmails)) {
                    $attendeeList[] = new Google_Service_Calendar_EventAttendee([
                        'email' => $creator->email,
                        'displayName' => $creator->name,
                    ]);
                    $addedEmails[] = strtolower(trim($creator->email));
                }
            }

            // 3. Other meeting/call attendees
            $attendees = $item->attendees ?? [];
            if ($attendees) {
                foreach ($attendees as $att) {
                    $attEmail = null;
                    $attName = null;
                    if ($att->attendee_type === 'user') {
                        $u = User::find($att->attendee_id);
                        if ($u) { $attEmail = $u->email; $attName = $u->name; }
                    } elseif ($att->attendee_type === 'contact') {
                        $c = Contact::find($att->attendee_id);
                        if ($c) { $attEmail = $c->email; $attName = $c->name; }
                    } elseif ($att->attendee_type === 'lead') {
                        $l = Lead::find($att->attendee_id);
                        if ($l) { $attEmail = $l->email; $attName = $l->name; }
                    }

                    if ($attEmail && !in_array(strtolower(trim($attEmail)), $addedEmails)) {
                        $attendeeList[] = new Google_Service_Calendar_EventAttendee([
                            'email' => $attEmail,
                            'displayName' => $attName,
                        ]);
                        $addedEmails[] = strtolower(trim($attEmail));
                    }
                }
            }

            if (!empty($attendeeList)) {
                $event->setAttendees($attendeeList);
            }

            $calendarId = $this->getCalendarId($targetUserId);
            $optParams = ['sendUpdates' => 'all'];
            $calendarEvent = $this->service->events->insert($calendarId, $event, $optParams);
            return $calendarEvent->getId();
        } catch (\Exception $e) {
            Log::error('Google Calendar event creation failed', [
                'error' => $e->getMessage(),
                'user_id' => $targetUserId,
                'type' => $type,
                'item_id' => $item->id ?? 'unknown'
            ]);
            return null;
        }
    }

    /**
     * Update an existing event in Google Calendar
     */
    public function updateEvent($eventId, $item, $userId = null, $type = 'meeting')
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());
        if (!$this->isEnabled($targetUserId) || !$eventId) {
            return false;
        }

        try {
            $this->setupClient($targetUserId);
            $calendarId = $this->getCalendarId($targetUserId);

            $event = $this->service->events->get($calendarId, $eventId);

            $event->setSummary($item->title ?? 'Event');
            $event->setDescription($item->description ?? '');
            $event->setLocation($item->location ?? '');

            $userTimezone = getSetting('defaultTimezone', 'Asia/Kolkata', $targetUserId);

            if (($type === 'meeting' || $type === 'call') && $item->start_date) {
                $startDate = $item->start_date instanceof \Carbon\Carbon ? $item->start_date->format('Y-m-d') : $item->start_date;
                $endDate = $item->end_date instanceof \Carbon\Carbon ? $item->end_date->format('Y-m-d') : ($item->end_date ?: $startDate);
                $startTimeStr = $item->start_time instanceof \Carbon\Carbon ? $item->start_time->format('H:i:s') : ($item->start_time ?: '09:00:00');
                $endTimeStr = $item->end_time instanceof \Carbon\Carbon ? $item->end_time->format('H:i:s') : ($item->end_time ?: '10:00:00');

                $startTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $startDate . ' ' . $startTimeStr, $userTimezone);
                $endTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $endDate . ' ' . $endTimeStr, $userTimezone);
            } elseif ($type === 'task' && $item->due_date) {
                $dueDate = $item->due_date instanceof \Carbon\Carbon ? $item->due_date->format('Y-m-d') : $item->due_date;
                $startTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $dueDate . ' 09:00:00', $userTimezone);
                $endTime = $startTime->copy()->addHour();
            } else {
                return false;
            }

            $start = new Google_Service_Calendar_EventDateTime();
            $start->setDateTime($startTime->format('c'));
            $event->setStart($start);

            $end = new Google_Service_Calendar_EventDateTime();
            $end->setDateTime($endTime->format('c'));
            $event->setEnd($end);

            // Update attendees list
            $attendeeList = [];
            $addedEmails = [];

            if (!empty($item->assigned_to)) {
                $assignedUser = User::find($item->assigned_to);
                if ($assignedUser && !empty($assignedUser->email)) {
                    $attendeeList[] = new Google_Service_Calendar_EventAttendee([
                        'email' => $assignedUser->email,
                        'displayName' => $assignedUser->name,
                        'responseStatus' => 'accepted',
                    ]);
                    $addedEmails[] = strtolower(trim($assignedUser->email));
                }
            }

            $creatorId = $item->created_by ?: $targetUserId;
            if (!empty($creatorId)) {
                $creator = User::find($creatorId);
                if ($creator && !empty($creator->email) && !in_array(strtolower(trim($creator->email)), $addedEmails)) {
                    $attendeeList[] = new Google_Service_Calendar_EventAttendee([
                        'email' => $creator->email,
                        'displayName' => $creator->name,
                    ]);
                    $addedEmails[] = strtolower(trim($creator->email));
                }
            }

            $attendees = $item->attendees ?? [];
            if ($attendees) {
                foreach ($attendees as $att) {
                    $attEmail = null;
                    $attName = null;
                    if ($att->attendee_type === 'user') {
                        $u = User::find($att->attendee_id);
                        if ($u) { $attEmail = $u->email; $attName = $u->name; }
                    } elseif ($att->attendee_type === 'contact') {
                        $c = Contact::find($att->attendee_id);
                        if ($c) { $attEmail = $c->email; $attName = $c->name; }
                    } elseif ($att->attendee_type === 'lead') {
                        $l = Lead::find($att->attendee_id);
                        if ($l) { $attEmail = $l->email; $attName = $l->name; }
                    }

                    if ($attEmail && !in_array(strtolower(trim($attEmail)), $addedEmails)) {
                        $attendeeList[] = new Google_Service_Calendar_EventAttendee([
                            'email' => $attEmail,
                            'displayName' => $attName,
                        ]);
                        $addedEmails[] = strtolower(trim($attEmail));
                    }
                }
            }

            if (!empty($attendeeList)) {
                $event->setAttendees($attendeeList);
            }

            $optParams = ['sendUpdates' => 'all'];
            $this->service->events->update($calendarId, $eventId, $event, $optParams);
            return true;
        } catch (\Exception $e) {
            Log::error('Google Calendar event update failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete an event from Google Calendar
     */
    public function deleteEvent($eventId, $userId = null)
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());
        if (!$this->isEnabled($targetUserId) || !$eventId) {
            return false;
        }

        try {
            $this->setupClient($targetUserId);
            $calendarId = $this->getCalendarId($targetUserId);

            $optParams = ['sendUpdates' => 'all'];
            $this->service->events->delete($calendarId, $eventId, $optParams);
            return true;
        } catch (\Exception $e) {
            Log::error('Google Calendar event deletion failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get events from Google Calendar
     */
    public function getEvents($userId = null, $maxResults = 100, $timeMin = null, $timeMax = null)
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : createdBy());

        if (!$this->isEnabled($targetUserId)) {
            return [];
        }

        try {
            $this->setupClient($targetUserId);
            $calendarId = $this->getCalendarId($targetUserId);

            $optParams = [
                'maxResults' => $maxResults,
                'orderBy' => 'startTime',
                'singleEvents' => true,
                'timeMin' => $timeMin ?: date('c', strtotime('-1 month')),
            ];

            if ($timeMax) {
                $optParams['timeMax'] = $timeMax;
            }

            $results = $this->service->events->listEvents($calendarId, $optParams);
            $events = $results->getItems();

            $user = User::find($targetUserId);
            $userEmail = $user ? strtolower(trim($user->email)) : null;

            return array_map(function($event) use ($userEmail) {
                $start = $event->getStart()->getDateTime() ?: $event->getStart()->getDate();
                $end = $event->getEnd()->getDateTime() ?: $event->getEnd()->getDate();

                $extendedProps = $event->getExtendedProperties();
                $type = 'event';
                $meetingId = null;
                $callId = null;

                if ($extendedProps && $extendedProps->getPrivate()) {
                    $privateProps = $extendedProps->getPrivate();
                    $type = $privateProps['app_type'] ?? 'event';
                    $meetingId = $type === 'meeting' ? ($privateProps['app_id'] ?? null) : null;
                    $callId = $type === 'call' ? ($privateProps['app_id'] ?? null) : null;
                }

                if (!$meetingId && !$callId) {
                    $cleanedId = $event->getId();
                    $meeting = Meeting::where('google_calendar_event_id', $cleanedId)->first();
                    if ($meeting) {
                        $type = 'meeting';
                        $meetingId = $meeting->id;
                    } else {
                        $call = Call::where('google_calendar_event_id', $cleanedId)->first();
                        if ($call) {
                            $type = 'call';
                            $callId = $call->id;
                        }
                    }
                }

                $bgColor = $type === 'meeting' ? '#3b82f6' : ($type === 'call' ? '#10b77f' : '#6366f1');
                $borderColor = $type === 'meeting' ? '#2563eb' : ($type === 'call' ? '#059669' : '#4f46e5');

                return [
                    'id' => 'google_' . $event->getId(),
                    'title' => $event->getSummary() ?: 'Untitled Event',
                    'start' => $start,
                    'end' => $end,
                    'backgroundColor' => $bgColor,
                    'borderColor' => $borderColor,
                    'color' => $bgColor,
                    'type' => $type,
                    'meeting_id' => $meetingId,
                    'call_id' => $callId,
                    'extendedProps' => [
                        'type' => $type,
                        'description' => $event->getDescription() ?: '',
                        'location' => $event->getLocation() ?: '',
                        'source' => 'google',
                        'start' => $start,
                        'end' => $end,
                        'meeting_id' => $meetingId,
                        'call_id' => $callId,
                    ]
                ];
            }, $events);
        } catch (\Exception $e) {
            Log::error('Google Calendar events fetch failed: ' . $e->getMessage());
            return [];
        }
    }
}
