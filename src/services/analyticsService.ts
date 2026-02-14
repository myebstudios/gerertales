
type EventName = 'story_created' | 'chapter_selected' | 'prose_generated' | 'audio_played' | 'story_deleted' | 'credits_purchased' | 'focus_mode_toggled';

interface AnalyticsEvent {
    name: EventName;
    properties?: Record<string, any>;
}

class AnalyticsService {
    private enabled: boolean = true;

    constructor() {
        // Initialize based on environment or user preference
        this.enabled = true;
    }

    public track(name: EventName, properties: Record<string, any> = {}) {
        if (!this.enabled) return;

        const event: AnalyticsEvent = {
            name,
            properties: {
                ...properties,
                timestamp: Date.now(),
                url: window.location.href,
                platform: navigator.platform
            }
        };

        // Log to console in development
        console.log(`[Analytics] ${name}`, event.properties);

        // Here we would send to Umami, Plausible, or a custom Supabase table
        // Example Umami call:
        // if ((window as any).umami) {
        //     (window as any).umami.track(name, properties);
        // }
    }
}

export const analytics = new AnalyticsService();
