// analytics-conditional.js - Conditional Google Analytics loading with proper consent
(function() {
    // Check cookie consent immediately
    const cookieConsent = localStorage.getItem('cookieConsent');
    
    // Initialize GA4 dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    
    if (cookieConsent === 'accepted') {
        // Full tracking with consent
        gtag('config', 'G-FEL31JE33S', {
            'anonymize_ip': false,
            'allow_google_signals': true,
            'allow_ad_personalization_signals': true
        });
        
        // Track page view
        gtag('event', 'page_view', {
            'page_title': document.title,
            'page_location': window.location.href
        });
        
    } else if (cookieConsent === 'rejected') {
        // Disable GA tracking completely
        window['ga-disable-G-FEL31JE33S'] = true;
        
        // Still configure gtag for function availability but with no tracking
        gtag('config', 'G-FEL31JE33S', {
            'anonymize_ip': true,
            'client_storage': 'none',
            'allow_google_signals': false,
            'allow_ad_personalization_signals': false
        });
        
    } else {
        // No consent decision yet - load minimal tracking
        gtag('config', 'G-FEL31JE33S', {
            'anonymize_ip': true,
            'client_storage': 'none',
            'allow_google_signals': false,
            'allow_ad_personalization_signals': false
        });
    }
    
    // Global function to enable analytics after consent
    window.enableAnalytics = function() {
        // Remove disable flag
        window['ga-disable-G-FEL31JE33S'] = false;
        
        // Re-configure with full tracking
        gtag('config', 'G-FEL31JE33S', {
            'anonymize_ip': false,
            'allow_google_signals': true,
            'allow_ad_personalization_signals': true
        });
        
        // Track consent acceptance
        gtag('event', 'cookie_consent_granted', {
            'event_category': 'engagement',
            'event_label': 'user_accepted_cookies'
        });
    };
    
    // Global function to disable analytics after rejection
    window.disableAnalytics = function() {
        window['ga-disable-G-FEL31JE33S'] = true;
        
        // Track consent rejection (anonymized)
        gtag('event', 'cookie_consent_denied', {
            'event_category': 'engagement',
            'event_label': 'user_rejected_cookies'
        });
    };
})();
