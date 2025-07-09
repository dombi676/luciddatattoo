document.addEventListener('DOMContentLoaded', () => {

  // ===================================
  // ===== GALLERY & LIGHTBOX MODULE ====
  // ===================================
  const galleryModule = (() => {
    // --- DOM Elements ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeButton = document.querySelector('.close');
    const prevButton = document.querySelector('.lightbox-nav.prev');
    const nextButton = document.querySelector('.lightbox-nav.next');
    const mobilePrevButton = document.querySelector('.mobile-nav-btn.mobile-prev');
    const mobileNextButton = document.querySelector('.mobile-nav-btn.mobile-next');
    const galleryGrid = document.querySelector('.gallery-grid');
    const galleryPreviewGrids = document.querySelectorAll('.gallery-preview-grid'); // Get ALL preview grids
    const filterButtons = document.querySelectorAll('.filter-btn');
    const magnifier = document.getElementById('magnifier');

    // Check if we're on a page with gallery functionality
    if (!lightbox || (!galleryGrid && galleryPreviewGrids.length === 0)) return;

    // --- State ---
    let currentIndex = 0;
    let visibleImages = [];
    let activeFilter = 'all';
    const isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;

    /**
     * Updates the gallery view based on the active filter.
     */
    function updateGalleryView() {
      const allItems = document.querySelectorAll('.gallery-item');
      visibleImages = [];

      allItems.forEach(item => {
        const isVisible = activeFilter === 'all' || item.classList.contains(activeFilter);
        item.style.display = isVisible ? 'block' : 'none';

        if (isVisible) {
          const thumbnail = item.querySelector('.thumbnail');
          if (thumbnail) {
            visibleImages.push(thumbnail);
          }
        }
      });
    }

    /**
     * Initialize visible images for index page (no filtering).
     */
    function initializeVisibleImages() {
      visibleImages = [];
      const allThumbnails = document.querySelectorAll('.thumbnail');
      allThumbnails.forEach(thumbnail => {
        visibleImages.push(thumbnail);
      });
    }

    /**
     * Opens the lightbox to a specific image index.
     * @param {number} index - The index of the image to show.
     */
    function openLightbox(index) {
      if (index < 0 || index >= visibleImages.length) {
        return;
      }

      currentIndex = index;
      const img = visibleImages[currentIndex];
      const pictureEl = img.closest('picture');
      const webpSource = pictureEl ? pictureEl.querySelector('source[type="image/webp"]') : null;
      
      // Stage 1: Load compressed/WebP version immediately for fast display
      const initialSrc = webpSource ? webpSource.srcset : img.src;
      lightboxImg.src = initialSrc;
      lightboxImg.alt = img.alt || 'Imagen ampliada';
      lightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent background scrolling

      // Stage 2: Progressive enhancement - load high-res version in background
      loadHighResVersion(img, lightboxImg);
    }

    /**
     * Loads high-resolution version of image for better zoom quality.
     * @param {HTMLImageElement} thumbnail - The thumbnail image element
     * @param {HTMLImageElement} lightboxImage - The lightbox image element
     */
    function loadHighResVersion(thumbnail, lightboxImage) {
      // Extract filename from thumbnail src
      const thumbnailSrc = thumbnail.src;
      const filename = thumbnailSrc.split('/').pop();
      
      // Construct uncompressed image path
      const highResSrc = thumbnailSrc.replace('/compressed/', '/uncompressed/');
      
      // Add loading indicator
      lightboxImage.style.opacity = '0.8';
      lightboxImage.dataset.highRes = 'loading';
      
      // Preload high-res image
      const highResImg = new Image();
      highResImg.onload = function() {
        // Only update if this is still the current lightbox image
        if (lightboxImage.src.includes(filename.split('.')[0])) {
          lightboxImage.src = highResSrc;
          lightboxImage.dataset.highRes = 'true';
          lightboxImage.style.opacity = '1';
          
          // Update magnifier background if it's being used
          if (magnifier && magnifier.style.display !== 'none') {
            magnifier.style.backgroundImage = `url('${highResSrc}')`;
          }
        }
      };
      
      highResImg.onerror = function() {
        // If high-res version fails, keep the compressed version
        lightboxImage.style.opacity = '1';
        lightboxImage.dataset.highRes = 'failed';
        console.log('High-res version not available for:', filename);
      };
      
      // Start loading high-res version
      highResImg.src = highResSrc;
    }

    /**
     * Closes the lightbox.
     */
    function closeLightbox() {
      lightbox.style.display = 'none';
      if (magnifier) magnifier.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
    }

    /**
     * Navigates to the previous or next image.
     * @param {number} direction - -1 for previous, 1 for next.
     */
    function navigateLightbox(direction) {
      currentIndex = (currentIndex + direction + visibleImages.length) % visibleImages.length;
      openLightbox(currentIndex);
    }

    /**
     * Handles magnifier movement on the lightbox image.
     */
    function handleMagnifier(e) {
        const imgRect = lightboxImg.getBoundingClientRect();
        const mouseX = e.clientX - imgRect.left;
        const mouseY = e.clientY - imgRect.top;

        if (mouseX < 0 || mouseX > imgRect.width || mouseY < 0 || mouseY > imgRect.height) {
            magnifier.style.display = 'none';
            return;
        }

        magnifier.style.display = 'block';
        const ZOOM_LEVEL = 1.2;
        const MAGNIFIER_SIZE = 400;

        magnifier.style.left = `${e.clientX - MAGNIFIER_SIZE / 2}px`;
        magnifier.style.top = `${e.clientY - MAGNIFIER_SIZE / 2}px`;

        const bgX = (mouseX / imgRect.width) * lightboxImg.naturalWidth * ZOOM_LEVEL - MAGNIFIER_SIZE / 2;
        const bgY = (mouseY / imgRect.height) * lightboxImg.naturalHeight * ZOOM_LEVEL - MAGNIFIER_SIZE / 2;

        magnifier.style.backgroundImage = `url('${lightboxImg.src}')`;
        magnifier.style.backgroundSize = `${lightboxImg.naturalWidth * ZOOM_LEVEL}px ${lightboxImg.naturalHeight * ZOOM_LEVEL}px`;
        magnifier.style.backgroundPosition = `-${bgX}px -${bgY}px`;
    }

    /**
     * Initializes all event listeners for the gallery and lightbox.
     */
    function init() {
      // Initialize filter buttons only if they exist (gallery page)
      if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
          button.addEventListener('click', () => {
            if (button.classList.contains('active')) return;
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter;
            updateGalleryView();
          });
        });
      }

      // Set up click listeners for gallery grid and all preview grids
      const clickableContainers = [galleryGrid, ...galleryPreviewGrids].filter(Boolean);
      clickableContainers.forEach(container => {
        container.addEventListener('click', (e) => {
          const clickedThumbnail = e.target.closest('.thumbnail');
          if (clickedThumbnail) {
            const index = visibleImages.indexOf(clickedThumbnail);
            if (index > -1) openLightbox(index);
          }
        });
      });

      // Lightbox navigation and controls
      if (closeButton) closeButton.addEventListener('click', closeLightbox);
      if (prevButton) prevButton.addEventListener('click', () => navigateLightbox(-1));
      if (nextButton) nextButton.addEventListener('click', () => navigateLightbox(1));
      
      // Mobile navigation buttons
      if (mobilePrevButton) mobilePrevButton.addEventListener('click', () => navigateLightbox(-1));
      if (mobileNextButton) mobileNextButton.addEventListener('click', () => navigateLightbox(1));

      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });

      document.addEventListener('keydown', (e) => {
        if (lightbox.style.display === 'flex') {
          if (e.key === 'Escape') closeLightbox();
          if (e.key === 'ArrowLeft') navigateLightbox(-1);
          if (e.key === 'ArrowRight') navigateLightbox(1);
        }
      });

      if (!isTouchDevice && lightboxImg && magnifier) {
        lightboxImg.addEventListener('mousemove', handleMagnifier);
        lightboxImg.addEventListener('mouseleave', () => {
            magnifier.style.display = 'none';
        });
      }
      
      // Initialize images based on page type
      if (galleryGrid) {
        updateGalleryView(); // Gallery page with filtering
      } else {
        initializeVisibleImages(); // Index page without filtering
      }
    }

    init();
  })();

  // ===================================
  // ===== MOBILE NAVIGATION MODULE ===
  // ===================================
  const mobileNavModule = (() => {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const navLinks = document.querySelector('.nav-links');
    const navContainer = document.querySelector('.nav-left'); // Container for the menu

    if (!hamburgerBtn || !navLinks || !navContainer) return;

    function toggleMenu(forceClose = false) {
      const isActive = navLinks.classList.contains('active') && !forceClose;
      navLinks.classList.toggle('active', !isActive);
      hamburgerBtn.classList.toggle('active', !isActive);
      hamburgerBtn.setAttribute('aria-expanded', !isActive);
    }

    function init() {
      hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
      });

      document.addEventListener('click', (e) => {
        if (!navContainer.contains(e.target) && navLinks.classList.contains('active')) {
          toggleMenu(true); // Force close
        }
      });

      navLinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          toggleMenu(true); // Force close on link click
        }
      });
    }
    
    init();
  })();

  // ===================================
  // ===== ACCESSIBILITY MODULE ========
  // ===================================
  const accessibilityModule = (() => {
    const accessibilityToggle = document.querySelector('.accessibility-toggle');
    const accessibilityOptions = document.querySelector('.accessibility-options');
    const accessibilityPanel = document.querySelector('.accessibility-panel');
    const fontToggleBtn = document.getElementById('font-toggle-btn');
    const highContrastBtn = document.getElementById('high-contrast-btn');
    const modeToggleBtn = document.getElementById('mode-toggle-btn'); // Assuming this is for light/dark mode

    if (!accessibilityPanel) return;

    function applyPreference(key, className, element = document.body) {
      if (localStorage.getItem(key) === 'true') {
        element.classList.add(className);
        // Also update button state if a button is associated with it
        if (key === 'website-font' && fontToggleBtn) fontToggleBtn.classList.add('active');
        if (key === 'high-contrast-mode' && highContrastBtn) highContrastBtn.classList.add('active');
      }
    }

    function togglePreference(key, className, button, element = document.body) {
        const isEnabled = element.classList.toggle(className);
        localStorage.setItem(key, isEnabled);
        if (button) button.classList.toggle('active', isEnabled);
    }

    function init() {
      // Apply saved preferences on page load
      applyPreference('website-font', 'roboto-font');
      applyPreference('high-contrast-mode', 'high-contrast-mode');
      // Add dark mode if it exists
      // applyPreference('dark-mode', 'dark-mode'); 

      if (localStorage.getItem('accessibilityPanelOpen') === 'true') {
        accessibilityOptions.classList.add('active');
        accessibilityToggle.setAttribute('aria-expanded', 'true');
      }

      accessibilityToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = accessibilityOptions.classList.toggle('active');
        accessibilityToggle.setAttribute('aria-expanded', isExpanded);
        localStorage.setItem('accessibilityPanelOpen', isExpanded);
      });

      document.addEventListener('click', (e) => {
        if (!accessibilityPanel.contains(e.target) && accessibilityOptions.classList.contains('active')) {
          accessibilityOptions.classList.remove('active');
          accessibilityToggle.setAttribute('aria-expanded', 'false');
          localStorage.setItem('accessibilityPanelOpen', 'false');
        }
      });

      if (fontToggleBtn) {
        fontToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          togglePreference('website-font', 'roboto-font', fontToggleBtn);
        });
      }

      if (highContrastBtn) {
        highContrastBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          togglePreference('high-contrast-mode', 'high-contrast-mode', highContrastBtn);
        });
      }
      
      // Add listener for dark/light mode toggle if it exists
      // if (modeToggleBtn) { ... }
    }

    init();
  })();

  // ===================================
  // ===== COOKIE CONSENT MODULE =======
  // ===================================
  const cookieConsentModule = (() => {
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptButton = document.getElementById('accept-cookies');
    const rejectButton = document.getElementById('reject-cookies');
    const policyModal = document.getElementById('cookie-policy-modal');
    const policyLink = document.getElementById('open-policy');
    const policyClose = document.querySelector('.policy-close');

    if (!cookieBanner) return;

    function handleConsent(consent) {
      localStorage.setItem('cookieConsent', consent);
      cookieBanner.style.display = 'none';
      if (consent === 'rejected') {
        window['ga-disable-G-FEL31JE33S'] = true;
      }
    }

    function init() {
      const consent = localStorage.getItem('cookieConsent');
      if (consent === null) {
        cookieBanner.style.display = 'block';
      } else if (consent === 'rejected') {
        window['ga-disable-G-FEL31JE33S'] = true;
      }

      acceptButton.addEventListener('click', () => handleConsent('accepted'));
      rejectButton.addEventListener('click', () => handleConsent('rejected'));

      if (policyLink && policyModal) {
        policyLink.addEventListener('click', (e) => {
          e.preventDefault();
          policyModal.style.display = 'block';
        });

        policyClose.addEventListener('click', () => {
          policyModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
          if (e.target === policyModal) {
            policyModal.style.display = 'none';
          }
        });
      }
    }

    init();
  })();

  // ===================================
  // ===== UI & GENERAL UTILITIES ======
  // ===================================
  const uiUtilsModule = (() => {
    
    /**
     * Smooth scrolling for anchor links.
     */
    function smoothScroll() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const targetId = this.getAttribute('href');
          // Do not scroll for placeholder hrefs
          if (targetId === '#') return;
          
          const target = document.querySelector(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    /**
     * FAQ Accordion functionality.
     */
    function faqAccordion() {
      const faqQuestions = document.querySelectorAll('.faq-question');
      
      faqQuestions.forEach((question, index) => {
        // Open the first FAQ item by default
        if (index === 0) {
          const answer = question.nextElementSibling;
          if (answer && answer.classList.contains('faq-answer')) {
            question.classList.add('active');
            answer.classList.add('active');
            question.setAttribute('aria-expanded', 'true');
          }
        }
        
        question.addEventListener('click', () => {
          const answer = question.nextElementSibling;
          if (answer && answer.classList.contains('faq-answer')) {
            // Toggle active classes for question and answer
            question.classList.toggle('active');
            answer.classList.toggle('active');
            // Update ARIA attribute
            const isExpanded = question.classList.contains('active');
            question.setAttribute('aria-expanded', isExpanded);
          }
        });
      });
    }

    /**
     * Article-specific features: progress bar and TOC smooth scroll.
     */
    function articleFeatures() {
      const progressBar = document.getElementById('article-progress');
      const articleContent = document.querySelector('.article-content');

      if (progressBar && articleContent) {
        window.addEventListener('scroll', () => {
          const windowHeight = window.innerHeight;
          const fullHeight = document.body.scrollHeight;
          const scrolled = window.scrollY;
          const scrollProgress = (scrolled / (fullHeight - windowHeight)) * 100;
          progressBar.style.width = `${scrollProgress}%`;
        });
      }

      document.querySelectorAll('.article-toc-list a').forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const targetElement = document.querySelector(this.getAttribute('href'));
          if (targetElement) {
            const headerOffset = 100; // Adjust for fixed header
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
          }
        });
      });
    }

    /**
     * "Back to Top" button visibility and functionality.
     */
    function backToTop() {
      const button = document.getElementById('back-to-top');
      if (!button) return;

      window.addEventListener('scroll', () => {
        button.classList.toggle('visible', window.scrollY > 300);
      });

      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    
    /**
     * Force specific font on navbar title.
     */
    function forceNavTitleFont() {
        const navTitle = document.querySelector('.nav-center h1');
        if (navTitle) {
            navTitle.style.fontFamily = "'UnifrakturMaguntia', cursive";
        }
    }

    /**
     * Initialize all UI utilities.
     */
    function init() {
      smoothScroll();
      faqAccordion();
      articleFeatures();
      backToTop();
      forceNavTitleFont();
    }

    init();
  })();

});