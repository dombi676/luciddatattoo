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

    // Check if we're on a page with gallery functionality
    if (!lightbox || (!galleryGrid && galleryPreviewGrids.length === 0)) return;

    // --- State ---
    let currentIndex = 0;
    let visibleImages = [];
    let activeFilter = 'all';
    const isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;
    let isNavigating = false;
    let imageCache = new Map(); // Cache for preloaded images
    let currentLoadingRequest = null; // Track current loading request

    /**
     * Preloads adjacent images for smoother navigation.
     * @param {number} currentIdx - Current image index
     */
    function preloadAdjacentImages(currentIdx) {
      const preloadIndexes = [
        (currentIdx - 1 + visibleImages.length) % visibleImages.length, // Previous
        (currentIdx + 1) % visibleImages.length // Next
      ];
      
      preloadIndexes.forEach(idx => {
        if (idx !== currentIdx && visibleImages[idx]) {
          const img = visibleImages[idx];
          const imagePaths = getProgressiveImagePaths(img);
          
          // Preload the large version for faster navigation
          const preloadImg = new Image();
          preloadImg.src = imagePaths.large;
          
          // Optionally preload xlarge for immediate high quality
          setTimeout(() => {
            const preloadXLarge = new Image();
            preloadXLarge.src = imagePaths.xlarge;
          }, 500);
        }
      });
    }
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
     * Opens the lightbox to a specific image index with progressive loading.
     * @param {number} index - The index of the image to show.
     */
    async function openLightbox(index) {
      if (index < 0 || index >= visibleImages.length) {
        return;
      }

      currentIndex = index;
      const img = visibleImages[currentIndex];
      
      // Cancel any ongoing loading request
      if (currentLoadingRequest) {
        currentLoadingRequest.cancelled = true;
      }
      
      // Create new loading request
      currentLoadingRequest = { cancelled: false };
      const thisRequest = currentLoadingRequest;
      
      try {
        // Progressive loading: start with medium, then large, then xlarge
        const imagePaths = getProgressiveImagePaths(img);
        
        // Check if this request was cancelled
        if (thisRequest.cancelled) return;
        
        // Set the medium image immediately but scale it to fill the container
        lightboxImg.src = imagePaths.medium;
        lightboxImg.alt = img.alt || 'Imagen ampliada';
        lightboxImg.style.opacity = '1';
        lightboxImg.style.transition = 'none'; // Remove any existing transitions
        
        // Force the image to scale properly while leaving room to click outside
        lightboxImg.style.objectFit = 'contain';
        lightboxImg.style.maxWidth = '85vw';
        lightboxImg.style.maxHeight = '85vh';
        lightboxImg.style.width = 'auto';
        lightboxImg.style.height = 'auto';
        
        // Show lightbox
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Progressive loading: medium → large → xlarge
        await loadProgressiveImage(imagePaths, thisRequest);
        
        // Preload adjacent images for smooth navigation
        preloadAdjacentImages(currentIndex);
        
      } catch (error) {
        console.log('Error loading image:', error);
        // Fallback to current image if progressive loading fails
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Imagen ampliada';
        // Apply same sizing for fallback
        lightboxImg.style.objectFit = 'contain';
        lightboxImg.style.width = '90vw';
        lightboxImg.style.height = '90vh';
        lightboxImg.style.maxWidth = '90vw';
        lightboxImg.style.maxHeight = '90vh';
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    }

    /**
     * Gets progressive image paths from an image element.
     * @param {HTMLImageElement} img - The image element
     * @returns {Object} Object containing all image size paths
     */
    function getProgressiveImagePaths(img) {
      const currentSrc = img.src;
      const largeSrc = img.dataset.large;
      const xlargeSrc = img.dataset.xlarge;
      const fallbackLargeSrc = img.dataset.fallbackLarge;
      
      // Determine WebP support
      const supportsWebp = document.querySelector('picture source[type="image/webp"]') !== null;
      
      return {
        medium: currentSrc, // Currently displayed image
        large: largeSrc || currentSrc.replace('/medium/', '/large/'),
        xlarge: xlargeSrc || currentSrc.replace('/medium/', '/xlarge/'),
        fallbackLarge: fallbackLargeSrc || currentSrc.replace('/webp/', '/fallback/').replace('/medium/', '/large/'),
        alt: img.alt || 'Imagen ampliada',
        supportsWebp: supportsWebp
      };
    }

    /**
     * Loads progressively larger images for better quality.
     * @param {Object} imagePaths - Object containing image paths
     * @param {Object} request - The loading request object
     */
    async function loadProgressiveImage(imagePaths, request) {
      // Step 1: Load large version
      if (imagePaths.large && !request.cancelled) {
        await loadImageVersion(imagePaths.large, imagePaths.fallbackLarge, request, 'large');
      }
      
      // Step 2: Load xlarge version for maximum quality
      if (imagePaths.xlarge && !request.cancelled) {
        await loadImageVersion(imagePaths.xlarge, imagePaths.fallbackLarge, request, 'xlarge');
      }
    }

    /**
     * Loads a specific image version with fallback support.
     * @param {string} primarySrc - The primary image source (WebP)
     * @param {string} fallbackSrc - The fallback image source (JPEG/PNG)
     * @param {Object} request - The loading request object
     * @param {string} version - The version being loaded (for logging)
     */
    function loadImageVersion(primarySrc, fallbackSrc, request, version) {
      return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = function() {
          if (!request.cancelled && request === currentLoadingRequest) {
            // Smooth, single transition without opacity flicker
            lightboxImg.src = primarySrc;
            
            // No additional updates needed after setting higher quality
          }
          resolve();
        };
        
        img.onerror = function() {
          // Try fallback version
          if (fallbackSrc && fallbackSrc !== primarySrc) {
            const fallbackImg = new Image();
            fallbackImg.onload = function() {
              if (!request.cancelled && request === currentLoadingRequest) {
                lightboxImg.src = fallbackSrc;
              }
              resolve();
            };
            fallbackImg.onerror = () => resolve(); // Give up on this version
            fallbackImg.src = fallbackSrc;
          } else {
            console.log(`Failed to load ${version} version:`, primarySrc);
            resolve();
          }
        };
        
        img.src = primarySrc;
      });
    }

    /**
     * Closes the lightbox.
     */
    function closeLightbox() {
      // Cancel any ongoing loading request
      if (currentLoadingRequest) {
        currentLoadingRequest.cancelled = true;
        currentLoadingRequest = null;
      }
      
      lightbox.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
      isNavigating = false; // Reset navigation state
    }

    /**
     * Navigates to the previous or next image.
     * @param {number} direction - -1 for previous, 1 for next.
     */
    async function navigateLightbox(direction) {
      if (isNavigating) return; // Prevent rapid navigation
      
      isNavigating = true;
      const newIndex = (currentIndex + direction + visibleImages.length) % visibleImages.length;
      
      try {
        // Update index immediately for instant response
        currentIndex = newIndex;
        const img = visibleImages[currentIndex];
        const imagePaths = getProgressiveImagePaths(img);
        
        // IMMEDIATELY set the new medium image for instant feedback
        lightboxImg.src = imagePaths.medium;
        lightboxImg.alt = imagePaths.alt;
        lightboxImg.style.transition = 'none'; // Prevent opacity flicker during navigation
        
        // Ensure proper scaling is maintained
        lightboxImg.style.objectFit = 'contain';
        lightboxImg.style.maxWidth = '85vw';
        lightboxImg.style.maxHeight = '85vh';
        lightboxImg.style.width = 'auto';
        lightboxImg.style.height = 'auto';
        
        // Cancel any ongoing loading request AFTER setting the image
        if (currentLoadingRequest) {
          currentLoadingRequest.cancelled = true;
        }
        
        currentLoadingRequest = { cancelled: false };
        const thisRequest = currentLoadingRequest;
        
        // Start progressive loading in background (non-blocking)
        loadProgressiveImage(imagePaths, thisRequest).catch(error => {
          console.log('Background progressive loading failed:', error);
        });
        
        // Preload adjacent images for next navigation
        preloadAdjacentImages(currentIndex);
        
      } catch (error) {
        console.log('Error during navigation:', error);
        // Fallback to current image
        const img = visibleImages[currentIndex];
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Imagen ampliada';
        // Apply sizing for fallback
        lightboxImg.style.objectFit = 'contain';
        lightboxImg.style.maxWidth = '85vw';
        lightboxImg.style.maxHeight = '85vh';
        lightboxImg.style.width = 'auto';
        lightboxImg.style.height = 'auto';
      } finally {
        // Reset navigation flag immediately for responsive navigation
        setTimeout(() => {
          isNavigating = false;
        }, 50); // Reduced from 150ms to 50ms for better responsiveness
      }
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
        container.addEventListener('click', async (e) => {
          const clickedThumbnail = e.target.closest('.thumbnail');
          if (clickedThumbnail) {
            const index = visibleImages.indexOf(clickedThumbnail);
            if (index > -1) await openLightbox(index);
          }
        });
      });

      // Lightbox navigation and controls
      if (closeButton) closeButton.addEventListener('click', closeLightbox);
      if (prevButton) prevButton.addEventListener('click', async () => await navigateLightbox(-1));
      if (nextButton) nextButton.addEventListener('click', async () => await navigateLightbox(1));
      
      // Mobile navigation buttons
      if (mobilePrevButton) {
        mobilePrevButton.addEventListener('click', async () => await navigateLightbox(-1));
        // Fix persistent active state on mobile
        mobilePrevButton.addEventListener('touchstart', (e) => {
          e.currentTarget.classList.add('touch-active');
        });
        mobilePrevButton.addEventListener('touchend', (e) => {
          e.currentTarget.classList.remove('touch-active');
          e.currentTarget.blur(); // Remove focus to prevent persistent state
        });
      }
      if (mobileNextButton) {
        mobileNextButton.addEventListener('click', async () => await navigateLightbox(1));
        // Fix persistent active state on mobile
        mobileNextButton.addEventListener('touchstart', (e) => {
          e.currentTarget.classList.add('touch-active');
        });
        mobileNextButton.addEventListener('touchend', (e) => {
          e.currentTarget.classList.remove('touch-active');
          e.currentTarget.blur(); // Remove focus to prevent persistent state
        });
      }

      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });

      document.addEventListener('keydown', async (e) => {
        if (lightbox.style.display === 'flex') {
          if (e.key === 'Escape') closeLightbox();
          if (e.key === 'ArrowLeft') await navigateLightbox(-1);
          if (e.key === 'ArrowRight') await navigateLightbox(1);
        }
      });
      
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

    // Check if already has event listeners to prevent duplicates
    if (hamburgerBtn.hasAttribute('data-nav-initialized')) {
      return;
    }

    function toggleMenu(forceClose = false) {
      const isActive = navLinks.classList.contains('active') && !forceClose;
      navLinks.classList.toggle('active', !isActive);
      hamburgerBtn.classList.toggle('active', !isActive);
      hamburgerBtn.setAttribute('aria-expanded', !isActive);
    }

    function init() {
      // Add click handler with multiple event types for better compatibility
      hamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
      });
      
      // Add touch support for mobile devices
      hamburgerBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
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
          // Small delay to allow navigation to complete before closing menu
          setTimeout(() => {
            toggleMenu(true); // Force close on link click
          }, 100);
        }
      });
      
      // Force initial state
      navLinks.classList.remove('active');
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      
      // Mark as initialized to prevent duplicates
      hamburgerBtn.setAttribute('data-nav-initialized', 'true');
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

    if (!cookieBanner || !acceptButton || !rejectButton) return;

    function handleConsent(consent) {
      localStorage.setItem('cookieConsent', consent);
      cookieBanner.style.display = 'none';
      
      if (consent === 'accepted') {
        // Enable full analytics tracking
        if (typeof window.enableAnalytics === 'function') {
          window.enableAnalytics();
        }
      } else if (consent === 'rejected') {
        // Disable analytics tracking
        if (typeof window.disableAnalytics === 'function') {
          window.disableAnalytics();
        }
      }
    }

    function init() {
      const consent = localStorage.getItem('cookieConsent');
      if (consent === null) {
        cookieBanner.style.display = 'block';
      } else if (consent === 'rejected') {
        // Analytics already disabled by analytics-conditional.js
        if (typeof window.disableAnalytics === 'function') {
          window.disableAnalytics();
        }
      } else if (consent === 'accepted') {
        // Analytics already enabled by analytics-conditional.js
        if (typeof window.enableAnalytics === 'function') {
          window.enableAnalytics();
        }
      }

      acceptButton.addEventListener('click', () => handleConsent('accepted'));
      rejectButton.addEventListener('click', () => handleConsent('rejected'));

      if (policyLink && policyModal && policyClose) {
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
      
      if (!faqQuestions.length) return; // Exit if no FAQ questions found
      
      // Initialize height for all answers
      faqQuestions.forEach((question) => {
        const answer = question.nextElementSibling;
        if (answer && answer.classList.contains('faq-answer')) {
          // Set initial state
          answer.style.maxHeight = '0px';
          answer.style.overflow = 'hidden';
          answer.style.transition = 'max-height 0.3s ease-out';
          question.setAttribute('aria-expanded', 'false');
          
          // Add click event listener
          question.addEventListener('click', function() {
            // Get the answer element
            const answer = this.nextElementSibling;
            
            // Toggle active state for this question/answer only
            const isActive = this.classList.contains('active');
            this.classList.toggle('active');
            
            if (answer && answer.classList.contains('faq-answer')) {
              answer.classList.toggle('active');
              // Toggle maxHeight between 0 and the actual height needed
              answer.style.maxHeight = isActive ? '0px' : `${answer.scrollHeight}px`;
              this.setAttribute('aria-expanded', !isActive);
            }
          });
        }
      });
      
      // Open first FAQ by default
      const firstQuestion = faqQuestions[0];
      const firstAnswer = firstQuestion.nextElementSibling;
      if (firstAnswer && firstAnswer.classList.contains('faq-answer')) {
        firstQuestion.classList.add('active');
        firstAnswer.classList.add('active');
        firstAnswer.style.maxHeight = `${firstAnswer.scrollHeight}px`;
        firstQuestion.setAttribute('aria-expanded', 'true');
      }
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