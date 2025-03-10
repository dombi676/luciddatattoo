// whatsapp-tracking.js - Add this to your project

/**
 * Enhanced WhatsApp contact tracking for Lucidda Tattoo
 * Provides detailed tracking of WhatsApp contact interactions from different sources
 */

// Helper functions for GA4 tracking
const WhatsAppTracker = {
    // Track contact interaction with detailed info
    trackContact: function(action, source, extraParams = {}) {
      if (typeof gtag !== 'function') return;
      
      // Check cookie consent
      const cookieConsent = localStorage.getItem('cookieConsent');
      if (cookieConsent === 'rejected') return;
      
      // Get device info
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Get time info
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      // Combine parameters with device and time info
      const params = {
        event_category: 'whatsapp_contact',
        source: source,
        device_type: isMobile ? 'mobile' : 'desktop',
        hour_of_day: hour,
        day_of_week: dayNames[dayOfWeek],
        ...extraParams
      };
      
      // Send event to GA4
      gtag('event', action, params);
      
      // Log tracking in debug mode
      if (window.location.hash === '#debug') {
        console.log(`WhatsApp tracking: ${action}`, params);
      }
    },
    
    // Add tracking to direct WhatsApp links
    initDirectLinkTracking: function() {
      // Find all WhatsApp buttons
      const whatsappLinks = document.querySelectorAll('a.whatsapp-btn, a[href*="wa.me"]');
      
      whatsappLinks.forEach(link => {
        // Skip if already tracked
        if (link.dataset.whatsappTracked) return;
        
        // Mark as tracked to avoid duplicate handlers
        link.dataset.whatsappTracked = 'true';
        
        // Add click event handler
        link.addEventListener('click', (e) => {
          // Get source from the link or default to "website"
          const source = link.dataset.source || 'website_direct';
          
          // Get any custom notes
          const notes = link.dataset.notes || '';
          
          // Prevent default to track event before redirect
          e.preventDefault();
          
          // Track the contact attempt
          this.trackContact('whatsapp_direct_click', source, { notes });
          
          // Continue to WhatsApp after a short delay
          setTimeout(() => {
            window.open(link.href, '_blank');
          }, 300);
        });
      });
    }
  };
  
  // Initialize tracking when the page is loaded
  document.addEventListener('DOMContentLoaded', () => {
    WhatsAppTracker.initDirectLinkTracking();
  });
  
  // Export tracker for direct use
  window.WhatsAppTracker = WhatsAppTracker;