import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or retrieve session ID
const getSessionId = (): string => {
    const key = 'snackzo_session_id';
    let sessionId = localStorage.getItem(key);

    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(key, sessionId);
    }

    return sessionId;
};

export function usePageTracking() {
    const location = useLocation();
    const lastTrackedPath = useRef<string | null>(null);
    const sessionId = useRef<string>(getSessionId());

    useEffect(() => {
        // Don't track admin pages
        if (location.pathname.startsWith('/admin')) {
            return;
        }

        // Avoid duplicate tracking for same path
        if (lastTrackedPath.current === location.pathname) {
            return;
        }

        lastTrackedPath.current = location.pathname;

        // Track page view
        const trackPageView = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                await supabase.from('page_views').insert({
                    session_id: sessionId.current,
                    page_path: location.pathname,
                    user_agent: navigator.userAgent,
                    referrer: document.referrer || null,
                    user_id: user?.id || null,
                });
            } catch (error) {
                // Silently fail - don't break app for tracking errors
                console.debug('Page tracking error:', error);
            }
        };

        trackPageView();
    }, [location.pathname]);
}
