import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

interface ActivityState {
    isActive: boolean;
    isCheckedIn: boolean;
    isOnBreak: boolean;
    status: 'active' | 'idle' | 'offline';
    sessionSeconds: number;
    activeSeconds: number;
    idleSeconds: number;
    formattedSessionTime: string;
    formattedActiveTime: string;
    formattedIdleTime: string;
    activePercentage: number;
    firstLoginAt: string | null;
}

interface ActivityContextType extends ActivityState {
    refreshSummary: () => Promise<void>;
}

const ActivityTrackerContext = createContext<ActivityContextType | undefined>(undefined);

function formatTime(totalSec: number): string {
    if (totalSec < 0) totalSec = 0;
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}

function getTodayKey(userId: number | string): string {
    const today = new Date().toISOString().split('T')[0];
    return `salescrm_activity_${userId}_${today}`;
}

export function ActivityTrackerProvider({ children }: { children: React.ReactNode }) {
    const page = usePage();
    const auth = (page.props as any)?.auth?.user;
    const userAttendance = (page.props as any)?.auth?.attendance;
    const userId = auth?.id;

    const isCheckedIn = Boolean(userAttendance?.isCheckedIn);
    const isOnBreak = Boolean(userAttendance?.isOnBreak);

    // Load initial cached state from localStorage if present
    const loadCachedState = () => {
        if (!userId) return null;
        try {
            const raw = localStorage.getItem(getTodayKey(userId));
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return null;
    };

    const cached = loadCachedState();

    const [isActive, setIsActive] = useState<boolean>(true);
    const [status, setStatus] = useState<'active' | 'idle' | 'offline'>(
        !isCheckedIn ? 'offline' : (isOnBreak ? 'idle' : 'active')
    );
    const [sessionSeconds, setSessionSeconds] = useState<number>(cached?.sessionSeconds || userAttendance?.totalSeconds || 0);
    const [activeSeconds, setActiveSeconds] = useState<number>(cached?.activeSeconds || userAttendance?.activeSeconds || 0);
    const [idleSeconds, setIdleSeconds] = useState<number>(cached?.idleSeconds || userAttendance?.idleSeconds || 0);
    const [firstLoginAt, setFirstLoginAt] = useState<string | null>(cached?.firstLoginAt || userAttendance?.formattedClockIn || null);

    // Refs for non-stale access in intervals & event listeners
    const lastInteractionRef = useRef<number>(Date.now());
    const isActiveRef = useRef<boolean>(true);
    const isCheckedInRef = useRef<boolean>(isCheckedIn);
    const isOnBreakRef = useRef<boolean>(isOnBreak);
    const pendingActiveRef = useRef<number>(0);
    const pendingIdleRef = useRef<number>(0);
    const isSendingHeartbeatRef = useRef<boolean>(false);

    // Keep refs in sync with props
    useEffect(() => {
        isCheckedInRef.current = isCheckedIn;
        isOnBreakRef.current = isOnBreak;

        if (!isCheckedIn) {
            setStatus('offline');
        } else if (isOnBreak) {
            setStatus('idle');
        } else {
            setStatus(isActiveRef.current ? 'active' : 'idle');
        }

        if (userAttendance?.activeSeconds !== undefined) {
            setActiveSeconds(prev => Math.max(prev, userAttendance.activeSeconds));
        }
        if (userAttendance?.idleSeconds !== undefined) {
            setIdleSeconds(prev => Math.max(prev, userAttendance.idleSeconds));
        }
        if (userAttendance?.totalSeconds !== undefined) {
            setSessionSeconds(prev => Math.max(prev, userAttendance.totalSeconds));
        }
    }, [isCheckedIn, isOnBreak, userAttendance]);

    // Idle threshold in milliseconds (60 seconds for responsive detection)
    const IDLE_THRESHOLD_MS = 60 * 1000;

    const sendHeartbeat = useCallback(async (activeDelta: number, idleDelta: number, activeState: boolean) => {
        if (!userId) return;
        if (!isCheckedInRef.current) return;
        if (isSendingHeartbeatRef.current) return;

        isSendingHeartbeatRef.current = true;
        try {
            const response = await axios.post(route('user-activity.heartbeat'), {
                active_delta: activeDelta,
                idle_delta: idleDelta,
                is_active: activeState,
                current_url: window.location.pathname + window.location.search,
            });

            if (response.data?.status === 'success' && response.data?.data) {
                const data = response.data.data;
                setActiveSeconds(prev => Math.max(prev, data.today_active_seconds));
                setIdleSeconds(prev => Math.max(prev, data.today_idle_seconds));
                setSessionSeconds(prev => Math.max(prev, data.today_total_seconds));
                if (data.first_login_at) {
                    setFirstLoginAt(data.first_login_at);
                }
            }
        } catch (err) {
            console.debug('Activity heartbeat ping failed:', err);
        } finally {
            isSendingHeartbeatRef.current = false;
        }
    }, [userId]);

    const refreshSummary = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await axios.get(route('user-activity.summary'));
            if (res.data?.status === 'success' && res.data?.data) {
                const data = res.data.data;
                setActiveSeconds(prev => Math.max(prev, data.today_active_seconds || 0));
                setIdleSeconds(prev => Math.max(prev, data.today_idle_seconds || 0));
                setSessionSeconds(prev => Math.max(prev, data.today_total_seconds || 0));
                if (data.first_login_at) {
                    setFirstLoginAt(data.first_login_at);
                }
            }
        } catch (err) {
            console.debug('Failed to fetch activity summary:', err);
        }
    }, [userId]);

    // Initial load from server and immediate online heartbeat if checked in
    useEffect(() => {
        if (userId) {
            refreshSummary();
            if (isCheckedInRef.current) {
                sendHeartbeat(0, 0, true);
            }
        }
    }, [userId, refreshSummary, sendHeartbeat]);

    // Sync across browser tabs using window storage events
    useEffect(() => {
        if (!userId) return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === getTodayKey(userId) && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.activeSeconds !== undefined) setActiveSeconds(data.activeSeconds);
                    if (data.idleSeconds !== undefined) setIdleSeconds(data.idleSeconds);
                    if (data.sessionSeconds !== undefined) setSessionSeconds(data.sessionSeconds);
                    if (data.firstLoginAt) setFirstLoginAt(data.firstLoginAt);
                } catch (err) {}
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [userId]);

    // Event listeners to capture active mouse/keyboard/scroll interactions
    useEffect(() => {
        if (!userId) return;

        const handleUserInteraction = () => {
            lastInteractionRef.current = Date.now();
            if (!isCheckedInRef.current) return;

            if (!isActiveRef.current) {
                isActiveRef.current = true;
                setIsActive(true);
                if (!isOnBreakRef.current) {
                    setStatus('active');
                }
                // Immediately notify server that user is active again
                const toSendActive = pendingActiveRef.current;
                const toSendIdle = pendingIdleRef.current;
                pendingActiveRef.current = 0;
                pendingIdleRef.current = 0;
                sendHeartbeat(toSendActive, toSendIdle, true);
            }
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(evt => window.addEventListener(evt, handleUserInteraction, { passive: true }));

        const handleVisibilityChange = () => {
            if (!isCheckedInRef.current) return;

            if (document.hidden) {
                isActiveRef.current = false;
                setIsActive(false);
                setStatus('idle');
                // Immediately notify server that user switched away
                const toSendActive = pendingActiveRef.current;
                const toSendIdle = pendingIdleRef.current;
                pendingActiveRef.current = 0;
                pendingIdleRef.current = 0;
                sendHeartbeat(toSendActive, toSendIdle, false);
            } else {
                handleUserInteraction();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            events.forEach(evt => window.removeEventListener(evt, handleUserInteraction));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [userId, sendHeartbeat]);

    // 1-Second Master Ticker
    useEffect(() => {
        if (!userId) return;

        const interval = setInterval(() => {
            // ONLY accumulate active/session time if user is officially checked in!
            if (!isCheckedInRef.current) {
                return;
            }

            const now = Date.now();
            const timeSinceLastInteraction = now - lastInteractionRef.current;
            const isTabHidden = document.hidden;
            const onBreak = isOnBreakRef.current;

            // User is active if tab is visible, not on break, and interacted within threshold
            const currentlyActive = !isTabHidden && !onBreak && timeSinceLastInteraction < IDLE_THRESHOLD_MS;

            if (currentlyActive !== isActiveRef.current) {
                isActiveRef.current = currentlyActive;
                setIsActive(currentlyActive);
                setStatus(currentlyActive ? 'active' : 'idle');

                // Instantly notify server of state change
                const toSendActive = pendingActiveRef.current;
                const toSendIdle = pendingIdleRef.current;
                pendingActiveRef.current = 0;
                pendingIdleRef.current = 0;
                sendHeartbeat(toSendActive, toSendIdle, currentlyActive);
            }

            // Increment local counters
            let newActive = 0;
            let newIdle = 0;
            let newSession = 0;

            if (currentlyActive) {
                setActiveSeconds(prev => {
                    newActive = prev + 1;
                    return newActive;
                });
                pendingActiveRef.current += 1;
            } else {
                setIdleSeconds(prev => {
                    newIdle = prev + 1;
                    return newIdle;
                });
                pendingIdleRef.current += 1;
            }

            setSessionSeconds(prev => {
                newSession = prev + 1;
                return newSession;
            });

            // Cache in localStorage to ensure seamless continuity across pages & tabs
            try {
                localStorage.setItem(getTodayKey(userId), JSON.stringify({
                    activeSeconds: activeSeconds + (currentlyActive ? 1 : 0),
                    idleSeconds: idleSeconds + (!currentlyActive ? 1 : 0),
                    sessionSeconds: sessionSeconds + 1,
                    firstLoginAt,
                    lastUpdated: Date.now(),
                }));
            } catch (e) {}

            // Send periodic batch heartbeat every 10 seconds (for fast sync)
            if (pendingActiveRef.current + pendingIdleRef.current >= 10) {
                const toSendActive = pendingActiveRef.current;
                const toSendIdle = pendingIdleRef.current;
                pendingActiveRef.current = 0;
                pendingIdleRef.current = 0;
                sendHeartbeat(toSendActive, toSendIdle, currentlyActive);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [userId, activeSeconds, idleSeconds, sessionSeconds, firstLoginAt, sendHeartbeat]);

    // Flush any pending seconds on page unload using sendBeacon or sync post
    useEffect(() => {
        if (!userId) return;

        const handleBeforeUnload = () => {
            if (!isCheckedInRef.current) return;
            const activeDelta = pendingActiveRef.current;
            const idleDelta = pendingIdleRef.current;
            if (activeDelta > 0 || idleDelta > 0) {
                const payload = JSON.stringify({
                    active_delta: activeDelta,
                    idle_delta: idleDelta,
                    is_active: isActiveRef.current,
                    current_url: window.location.pathname,
                });
                if (navigator.sendBeacon) {
                    const blob = new Blob([payload], { type: 'application/json' });
                    navigator.sendBeacon(route('user-activity.heartbeat'), blob);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [userId]);

    const total = activeSeconds + idleSeconds;
    const activePct = total > 0 ? Math.round((activeSeconds / total) * 100) : 0;

    return (
        <ActivityTrackerContext.Provider
            value={{
                isActive,
                isCheckedIn,
                isOnBreak,
                status,
                sessionSeconds,
                activeSeconds,
                idleSeconds,
                formattedSessionTime: formatTime(sessionSeconds),
                formattedActiveTime: formatTime(activeSeconds),
                formattedIdleTime: formatTime(idleSeconds),
                activePercentage: activePct,
                firstLoginAt,
                refreshSummary,
            }}
        >
            {children}
        </ActivityTrackerContext.Provider>
    );
}

export function useActivityTracker() {
    const context = useContext(ActivityTrackerContext);
    if (!context) {
        throw new Error('useActivityTracker must be used within an ActivityTrackerProvider');
    }
    return context;
}
