// redirect-script.js - Properly handles consent for tracking
document.addEventListener('DOMContentLoaded', function() {
    // Get source information
    const sourceElement = document.getElementById('source-data');
    const source = sourceElement ? sourceElement.getAttribute('data-source') : 'unknown';
    
    // Set source information in HTML
    const sourceIndicator = document.getElementById('source-indicator');
    if (sourceIndicator) {
        sourceIndicator.textContent = 'via ' + source;
    }
    
    // Check if cookie consent is EXPLICITLY accepted
    const cookieConsent = localStorage.getItem('cookieConsent');
    
    // Track the WhatsApp contact view event only if consent was given
    if (cookieConsent === 'accepted' && typeof gtag === 'function') {
        gtag('event', 'whatsapp_contact_view', {
            'event_category': 'engagement',
            'event_label': source
        });
    }
    
    // Add click tracking to the WhatsApp link
    const whatsappLink = document.getElementById('whatsapp-link');
    if (whatsappLink) {
        whatsappLink.addEventListener('click', function(e) {
            // Only track click if consent was explicitly given
            if (cookieConsent === 'accepted' && typeof gtag === 'function') {
                e.preventDefault();
                
                // Track the click event
                gtag('event', 'whatsapp_contact_click', {
                    'event_category': 'engagement',
                    'event_label': source,
                    'event_callback': function() {
                        window.location.href = e.target.closest('a').href;
                    }
                });
                
                // Fallback redirect after a timeout
                setTimeout(function() {
                    window.location.href = e.target.closest('a').href;
                }, 500);
            }
            // If no consent, just let the link work normally without tracking
        });
    }
    
    // Set up automatic redirect regardless of tracking consent
    setTimeout(function() {
        if (cookieConsent === 'accepted' && typeof gtag === 'function') {
            // Track the auto-redirect event with consent
            gtag('event', 'whatsapp_auto_redirect', {
                'event_category': 'engagement',
                'event_label': source,
                'event_callback': function() {
                    if (whatsappLink) {
                        window.location.href = whatsappLink.href;
                    }
                }
            });
            
            // Fallback redirect
            setTimeout(function() {
                if (whatsappLink) {
                    window.location.href = whatsappLink.href;
                }
            }, 500);
        } else {
            // Just redirect without tracking if no consent
            if (whatsappLink) {
                window.location.href = whatsappLink.href;
            }
        }
    }, 2500);
    
    // Show the cookie banner if no choice has been made yet
    if (cookieConsent === null) {
        // Check if the banner exists on this page
        const cookieBanner = document.getElementById('cookie-banner');
        if (cookieBanner) {
            cookieBanner.style.display = 'block';
        } else {
            // If the banner doesn't exist on this page, you might want to
            // create it dynamically or handle differently
            console.log("Cookie consent needed but banner not available on this page");
        }
    }
});