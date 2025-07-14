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
    let isNavigating = false;
    let imageCache = new Map(); // Cache for preloaded images
    let currentLoadingRequest = null; // Track current loading request

    /**
     * Preloads an image and caches it for faster navigation.
     * @param {HTMLImageElement} thumbnailImg - The thumbnail image element
     * @returns {Promise} Promise that resolves with the image paths
     */
    function preloadImage(thumbnailImg) {
      const thumbnailSrc = thumbnailImg.src;
      const cacheKey = thumbnailSrc;
      
      // Return cached version if available
      if (imageCache.has(cacheKey)) {
        return Promise.resolve(imageCache.get(cacheKey));
      }
      
      // Generate image paths
      let compressedSrc = thumbnailSrc.replace('/thumbnails/fallback/', '/compressed/');
      compressedSrc = compressedSrc.replace('/thumbnails/webp/', '/compressed/');
      const highResSrc = compressedSrc.replace('/compressed/', '/uncompressed/');
      
      const imagePaths = {
        compressed: compressedSrc,
        highRes: highResSrc,
        alt: thumbnailImg.alt || 'Imagen ampliada'
      };
      
      // Preload compressed image
      return new Promise((resolve) => {
        const compressedImg = new Image();
        compressedImg.onload = () => {
          imageCache.set(cacheKey, imagePaths);
          
          // Start preloading high-res version in background
          const highResImg = new Image();
          highResImg.onload = () => {
            imagePaths.highResLoaded = true;
          };
          highResImg.src = highResSrc;
          
          resolve(imagePaths);
        };
        compressedImg.onerror = () => {
          resolve(imagePaths); // Still resolve with paths even if preload fails
        };
        compressedImg.src = compressedSrc;
      });
    }

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
          preloadImage(visibleImages[idx]);
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
     * Opens the lightbox to a specific image index.
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
        // Preload the image
        const imagePaths = await preloadImage(img);
        
        // Check if this request was cancelled (user navigated away)
        if (thisRequest.cancelled) return;
        
        // Set the compressed image immediately
        lightboxImg.src = imagePaths.compressed;
        lightboxImg.alt = imagePaths.alt;
        lightboxImg.style.opacity = '1';
        
        // Show lightbox
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Load high-res version if not already loaded
        if (!imagePaths.highResLoaded) {
          loadHighResVersion(imagePaths, thisRequest);
        } else {
          // High-res already loaded, use it immediately
          if (!thisRequest.cancelled) {
            lightboxImg.src = imagePaths.highRes;
            
            // Update magnifier background if it's being used
            if (magnifier && magnifier.style.display !== 'none') {
              magnifier.style.backgroundImage = `url('${imagePaths.highRes}')`;
            }
          }
        }
        
        // Preload adjacent images for smooth navigation
        preloadAdjacentImages(currentIndex);
        
      } catch (error) {
        console.log('Error loading image:', error);
        // Fallback to direct loading if preload fails
        const thumbnailSrc = img.src;
        let compressedSrc = thumbnailSrc.replace('/thumbnails/fallback/', '/compressed/');
        compressedSrc = compressedSrc.replace('/thumbnails/webp/', '/compressed/');
        
        lightboxImg.src = compressedSrc;
        lightboxImg.alt = img.alt || 'Imagen ampliada';
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
    }

    /**
     * Loads high-resolution version of image for better zoom quality.
     * @param {Object} imagePaths - Object containing image paths
     * @param {Object} request - The loading request object
     */
    function loadHighResVersion(imagePaths, request) {
      // Don't show loading indicator or change opacity - keep image stable
      const highResImg = new Image();
      
      highResImg.onload = function() {
        // Only update if this request wasn't cancelled and is still current
        if (!request.cancelled && request === currentLoadingRequest) {
          lightboxImg.src = imagePaths.highRes;
          imagePaths.highResLoaded = true;
          
          // Update magnifier background if it's being used
          if (magnifier && magnifier.style.display !== 'none') {
            magnifier.style.backgroundImage = `url('${imagePaths.highRes}')`;
          }
        }
      };
      
      highResImg.onerror = function() {
        // High-res version failed, but keep the compressed version
        console.log('High-res version not available for:', imagePaths.highRes);
      };
      
      // Start loading high-res version
      highResImg.src = imagePaths.highRes;
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
      if (magnifier) magnifier.style.display = 'none';
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
        // Check if the target image is already preloaded
        const targetImg = visibleImages[newIndex];
        const imagePaths = await preloadImage(targetImg);
        
        // Cancel any ongoing loading request
        if (currentLoadingRequest) {
          currentLoadingRequest.cancelled = true;
        }
        
        // Create new loading request
        currentLoadingRequest = { cancelled: false };
        const thisRequest = currentLoadingRequest;
        
        // Update index and image immediately
        currentIndex = newIndex;
        lightboxImg.src = imagePaths.compressed;
        lightboxImg.alt = imagePaths.alt;
        
        // Use high-res if already loaded, otherwise load it
        if (imagePaths.highResLoaded) {
          lightboxImg.src = imagePaths.highRes;
          
          // Update magnifier background if it's being used
          if (magnifier && magnifier.style.display !== 'none') {
            magnifier.style.backgroundImage = `url('${imagePaths.highRes}')`;
          }
        } else {
          loadHighResVersion(imagePaths, thisRequest);
        }
        
        // Preload adjacent images for next navigation
        preloadAdjacentImages(currentIndex);
        
      } catch (error) {
        console.log('Error during navigation:', error);
        // Fallback to original method if preload fails
        currentIndex = newIndex;
        const img = visibleImages[currentIndex];
        const thumbnailSrc = img.src;
        let compressedSrc = thumbnailSrc.replace('/thumbnails/fallback/', '/compressed/');
        compressedSrc = compressedSrc.replace('/thumbnails/webp/', '/compressed/');
        
        lightboxImg.src = compressedSrc;
        lightboxImg.alt = img.alt || 'Imagen ampliada';
      } finally {
        // Reset navigation flag after a short delay to prevent double-clicks
        setTimeout(() => {
          isNavigating = false;
        }, 150);
      }
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
      if (mobilePrevButton) mobilePrevButton.addEventListener('click', async () => await navigateLightbox(-1));
      if (mobileNextButton) mobileNextButton.addEventListener('click', async () => await navigateLightbox(1));

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