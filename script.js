document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const magnifier = document.getElementById('magnifier');
  const closeButton = document.querySelector('.close');
  const prevButton = document.querySelector('.lightbox-nav.prev');
  const nextButton = document.querySelector('.lightbox-nav.next');
  
  // Constants
  const ZOOM_LEVEL = 1.2;
  const MAGNIFIER_SIZE = 400;
  
  // State
  let currentIndex = 0;
  let galleryImages = [];
  let visibleImages = []; // Track visible images based on filter
  let navigationLock = false;
  let isTouchDevice = false;
  let activeXHRs = {}; // Track active XHRs by index
  let blobCache = {}; // Cache for created blob URLs
  let loadingStates = {}; // Track loading states to prevent duplicate loads
  let activeFilter = 'all'; // Track the active filter
  
  // Check if we're on the index page
  const isIndexPage = document.body.getAttribute('data-page') === 'index';
  
  // Track when we're showing the gallery prompt
  let showingGalleryPrompt = false;
  
  try {
    document.createEvent("TouchEvent");
    isTouchDevice = true;
  } catch (e) {
    isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;
  }

  // Initialize gallery images
  function updateGalleryImages() {
    // Get all thumbnails
    galleryImages = Array.from(document.querySelectorAll('.thumbnail'));
    
    // Update visible images based on active filter
    if (activeFilter === 'all') {
      visibleImages = [...galleryImages];
    } else {
      // Only include images that are in a gallery-item with the active filter class
      visibleImages = galleryImages.filter(img => {
        const galleryItem = img.closest('.gallery-item');
        return galleryItem && galleryItem.classList.contains(activeFilter);
      });
    }
    
    return galleryImages;
  }
  
  // Create or get progress bar
  function getProgressBar() {
    let progressBar = document.getElementById('lightbox-progress');
    
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'lightbox-progress';
      progressBar.className = 'lightbox-progress';
      
      // Force styles to ensure visibility
      progressBar.style.position = 'absolute';
      progressBar.style.bottom = '0';
      progressBar.style.left = '0';
      progressBar.style.height = '4px';
      progressBar.style.backgroundColor = '#ff4444';
      progressBar.style.width = '0%';
      progressBar.style.transition = 'width 0.3s ease';
      progressBar.style.zIndex = '1003';
      progressBar.style.display = 'none';
      
      lightbox.appendChild(progressBar);
    }
    
    return progressBar;
  }
  
  // Create and get gallery prompt
  function createGalleryPrompt() {
    let galleryPrompt = document.getElementById('gallery-prompt');
    
    if (!galleryPrompt) {
      galleryPrompt = document.createElement('div');
      galleryPrompt.id = 'gallery-prompt';
      galleryPrompt.className = 'gallery-prompt';
      
      // Add styles directly to the document
      if (!document.getElementById('gallery-prompt-styles')) {
        const style = document.createElement('style');
        style.id = 'gallery-prompt-styles';
        style.textContent = `
          .gallery-prompt {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1005;
            width: auto;
            max-width: 90%;
            user-select: none;
          }
          .prompt-content {
            background-color: rgba(34, 34, 34, 0.95);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
          }
          .prompt-content h3 {
            font-family: 'UnifrakturMaguntia', cursive;
            color: #ff4444;
            font-size: 2em;
            margin-bottom: 20px;
          }
          .prompt-content p {
            margin-bottom: 25px;
            font-size: 1.2em;
            color: #e0e0e0;
          }
          .prompt-content .gallery-btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #ff4444;
            color: #1a1a1a;
            border-radius: 5px;
            font-size: 20px;
            transition: background-color 0.3s ease;
            text-decoration: none;
            cursor: pointer;
          }
          .prompt-content .gallery-btn:hover {
            background-color: #e03333;
          }
        `;
        document.head.appendChild(style);
      }
      
      galleryPrompt.innerHTML = `
        <div class="prompt-content">
          <h3>Explora más diseños</h3>
          <p>Hay más diseños y trabajos en la galería completa.</p>
          <a href="gallery" class="gallery-btn">Ver Galería Completa</a>
        </div>
      `;
      
      lightbox.appendChild(galleryPrompt);
    }
    
    return galleryPrompt;
  }
  
  // Show gallery prompt
  function showGalleryPrompt() {
    const galleryPrompt = createGalleryPrompt();
    galleryPrompt.style.display = 'block';
    showingGalleryPrompt = true;
  }
  
  // Hide gallery prompt
  function hideGalleryPrompt() {
    const galleryPrompt = document.getElementById('gallery-prompt');
    if (galleryPrompt) {
      galleryPrompt.style.display = 'none';
    }
    showingGalleryPrompt = false;
  }
  
  // Open lightbox with specific image
  function openLightbox(index) {
    if (navigationLock) {
      console.log('Navigation locked, waiting...');
      return;
    }
    
    navigationLock = true;
    console.log('Setting navigation lock');
    
    // Hide gallery prompt if showing
    if (showingGalleryPrompt) {
      hideGalleryPrompt();
    }
    
    // Cancel any previous image onload handlers
    lightboxImg.onload = null;
    
    // Update gallery images
    updateGalleryImages();
    
    // Ensure index is valid for visible images
    if (visibleImages.length === 0) {
      console.error('No visible images to display');
      navigationLock = false;
      return;
    }
    
    // Find the index in the full gallery based on the visible index
    let targetImg;
    let fullGalleryIndex;
    
    if (typeof index === 'number') {
      // If we're working with visible images array index
      if (index < 0 || index >= visibleImages.length) {
        console.error('Invalid visible image index:', index);
        navigationLock = false;
        return;
      }
      
      targetImg = visibleImages[index];
      fullGalleryIndex = galleryImages.indexOf(targetImg);
      
      // Update current index to the visible images array index
      currentIndex = index;
    } else {
      // If we're working with an actual image element
      targetImg = index;
      fullGalleryIndex = galleryImages.indexOf(targetImg);
      
      // Find the index in the visible images array
      const visibleIndex = visibleImages.indexOf(targetImg);
      if (visibleIndex !== -1) {
        currentIndex = visibleIndex;
      } else {
        console.error('Image not in visible set');
        navigationLock = false;
        return;
      }
    }
    
    // Mark all other images as not currently viewed
    markAllXHRsAsNotCurrentlyViewed();
    
    // Get the thumbnail
    const img = targetImg;
    
    // Get source image paths
    const pictureEl = img.closest('picture');
    let webpPath = '';
    let compressedPath = img.src;
    
    // Try to get WebP path
    if (pictureEl) {
      const sourceEl = pictureEl.querySelector('source[type="image/webp"]');
      if (sourceEl && sourceEl.srcset) {
        webpPath = sourceEl.srcset;
      }
    }
    
    // Get uncompressed path
    const uncompressedPath = compressedPath
      .replace('/compressed/', '/uncompressed/')
      .replace(/\.(jpg|jpeg|png)$/i, `.${compressedPath.split('.').pop()}`);
    
    // Display lightbox
    lightbox.style.display = 'flex';
    lightboxImg.style.display = 'block'; // Ensure image is visible
    
    // Initial state of image
    lightboxImg.style.opacity = '0.3';
    
    const progressBar = getProgressBar();
    progressBar.style.width = '0%';
    progressBar.style.display = 'none';
    
    // Check if we have a cached blob URL for this image
    if (blobCache[fullGalleryIndex]) {
      // Use cached blob URL
      lightboxImg.src = blobCache[fullGalleryIndex];
      lightboxImg.alt = img.alt || 'Imagen ampliada';
      
      // Once the image is loaded from cache, we can unlock navigation
      lightboxImg.onload = function() {
        lightboxImg.style.opacity = '1';
        console.log('Releasing navigation lock (cached image loaded)');
        navigationLock = false;
      };
    } else {
      // First show the compressed/WebP image
      lightboxImg.src = webpPath || compressedPath;
      lightboxImg.alt = img.alt || 'Imagen ampliada';
      
      // Once the initial compressed image is loaded, unlock navigation
      lightboxImg.onload = function() {
        // Clear this handler to prevent multiple calls
        lightboxImg.onload = null;
        
        lightboxImg.style.opacity = '1';
        console.log('Releasing navigation lock (compressed image loaded)');
        navigationLock = false;
        
        // Now start downloading the high-res version if not already loading/loaded
        if (!loadingStates[fullGalleryIndex]) {
          loadHighResImage(fullGalleryIndex, uncompressedPath);
        }
      };
    }
    
    // Safety release of navigation lock after a timeout (in case onload never fires)
    setTimeout(() => {
      if (navigationLock) {
        console.log('Safety releasing navigation lock after timeout');
        navigationLock = false;
      }
    }, 3000);
  }
  
  // Function to load high-res image as a separate process
  function loadHighResImage(index, uncompressedPath) {
    // Mark this image as currently loading
    loadingStates[index] = 'loading';
    
    // Progress bar should only be visible now, after initial image is loaded
    const progressBar = getProgressBar();
    progressBar.style.display = 'block';
    
    // Set up a simple XHR to track loading progress
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uncompressedPath, true);
    xhr.responseType = 'blob';
    
    // Store this XHR as the active one for this index
    activeXHRs[index] = {
      xhr: xhr,
      isCurrentlyViewed: currentIndex === index // Track if this is still in view
    };
    
    // Track progress
    xhr.onprogress = function(e) {
      // Only update progress bar if this is still the current image
      if (activeXHRs[index] && activeXHRs[index].isCurrentlyViewed && e.lengthComputable) {
        const percentComplete = Math.floor((e.loaded / e.total) * 100);
        progressBar.style.width = `${percentComplete}%`;
      }
    };
    
    // When high-res image loads
    xhr.onload = function() {
      if (xhr.status === 200) {
        // Mark as loaded
        loadingStates[index] = 'loaded';
        
        // Create a blob URL from the response
        const blob = xhr.response;
        const blobUrl = URL.createObjectURL(blob);
        
        // Cache the blob URL
        blobCache[index] = blobUrl;
        
        // Only update the display if this is still the current image
        if (activeXHRs[index] && activeXHRs[index].isCurrentlyViewed && currentIndex === index) {
          // Create a new image to test if the blob loads correctly
          const testImg = new Image();
          testImg.onload = function() {
            // If the test load works, update the actual lightbox image
            lightboxImg.src = blobUrl;
            progressBar.style.display = 'none';
          };
          testImg.onerror = function() {
            // If there's a problem with the blob, keep using the current image
            console.error('Could not load blob URL');
            progressBar.style.display = 'none';
          };
          testImg.src = blobUrl;
        } else {
          // Not the current image, just hide progress
          if (activeXHRs[index] && activeXHRs[index].isCurrentlyViewed) {
            progressBar.style.display = 'none';
          }
        }
        
        // Clean up
        delete activeXHRs[index];
      } else {
        // On error
        loadingStates[index] = 'error';
        
        // Hide progress
        if (activeXHRs[index] && activeXHRs[index].isCurrentlyViewed) {
          progressBar.style.display = 'none';
        }
        delete activeXHRs[index];
      }
    };
    
    xhr.onerror = function() {
      // On error
      loadingStates[index] = 'error';
      
      // Hide progress
      if (activeXHRs[index] && activeXHRs[index].isCurrentlyViewed) {
        progressBar.style.display = 'none';
      }
      delete activeXHRs[index];
    };
    
    xhr.send();
  }
  
  // Mark all currently loading images as no longer being viewed
  function markAllXHRsAsNotCurrentlyViewed() {
    for (const index in activeXHRs) {
      if (activeXHRs[index]) {
        activeXHRs[index].isCurrentlyViewed = false;
      }
    }
    
    // Hide progress bar
    const progressBar = document.getElementById('lightbox-progress');
    if (progressBar) {
      progressBar.style.display = 'none';
    }
  }
  
  // Navigation functions
  function prevImage() {
    // If showing gallery prompt, hide it and go back to the last image
    if (showingGalleryPrompt) {
      hideGalleryPrompt();
      return;
    }
    
    // Check for navigation lock
    if (navigationLock) {
      console.log('Navigation locked, cannot go to previous image');
      return;
    }
    
    // Cancel any onload handlers
    lightboxImg.onload = null;
    
    // Mark all XHRs as not being viewed
    markAllXHRsAsNotCurrentlyViewed();
    
    // Load the previous image
    updateGalleryImages();
    
    // Get previous index based on visible images
    const prevIndex = (currentIndex - 1 + visibleImages.length) % visibleImages.length;
    openLightbox(prevIndex);
  }
  
  // Next image function with gallery prompt
  function nextImage() {
    // Check if we're showing the gallery prompt
    if (showingGalleryPrompt) {
      hideGalleryPrompt();
      
      // Go to the first visible image
      updateGalleryImages();
      openLightbox(0);
      return;
    }
    
    // Check for navigation lock
    if (navigationLock) {
      console.log('Navigation locked, cannot go to next image');
      return;
    }
    
    // Check if we're on the index page and at the last image
    if (isIndexPage && currentIndex === visibleImages.length - 1) {
      showGalleryPrompt();
      return;
    }
    
    // Cancel any onload handlers
    lightboxImg.onload = null;
    
    // Mark all XHRs as not being viewed
    markAllXHRsAsNotCurrentlyViewed();
    
    // Load the next image
    updateGalleryImages();
    
    // Get next index based on visible images
    const nextIndex = (currentIndex + 1) % visibleImages.length;
    openLightbox(nextIndex);
  }
  
  // Close lightbox and cleanup
  function closeLightbox() {
    // Reset gallery prompt state
    hideGalleryPrompt();
    
    // Cancel any onload handlers
    lightboxImg.onload = null;
    
    // Mark all XHRs as not being viewed
    markAllXHRsAsNotCurrentlyViewed();
    
    // Hide lightbox
    lightbox.style.display = 'none';
    
    // Reset/hide progress bar
    const progressBar = document.getElementById('lightbox-progress');
    if (progressBar) {
      progressBar.style.display = 'none';
      progressBar.style.width = '0%';
    }
  }
  
  // Properly revoke blob URLs when the page is being unloaded
  window.addEventListener('beforeunload', function() {
    for (const index in blobCache) {
      if (blobCache[index]) {
        URL.revokeObjectURL(blobCache[index]);
      }
    }
  });
  
  // Set up thumbnail listeners
  function setupThumbnailListeners() {
    document.querySelectorAll('.thumbnail').forEach((img, index) => {
      img.addEventListener('click', function() {
        // When clicking a thumbnail, find its index in the visible images array
        updateGalleryImages(); // Make sure visible images is up to date
        const visibleIndex = visibleImages.indexOf(img);
        
        if (visibleIndex !== -1) {
          openLightbox(visibleIndex);
        } else {
          console.warn('Clicked on a thumbnail that is not in the visible set');
        }
      });
    });
  }
  
  // Initialize
  updateGalleryImages();
  setupThumbnailListeners();
  
  // Navigation events
  if (prevButton) {
    prevButton.addEventListener('click', function(e) {
      e.stopPropagation();
      prevImage();
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', function(e) {
      e.stopPropagation();
      nextImage();
    });
  }
  
  // Close button events
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closeLightbox();
    });
  }
  
  // Ensure clicking outside the lightbox content closes it even when gallery prompt is showing
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      // Check if user clicked directly on the lightbox background (not on any child elements)
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }
  
  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (lightbox && lightbox.style.display === 'flex') {
      if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    }
  });
  
  // Magnifier functionality (for non-touch devices)
  if (!isTouchDevice && lightboxImg && magnifier) {
    lightboxImg.addEventListener('mousemove', (e) => {
      const imgRect = lightboxImg.getBoundingClientRect();
      const imgWidth = lightboxImg.naturalWidth;
      const imgHeight = lightboxImg.naturalHeight;
      
      const mouseX = e.clientX - imgRect.left;
      const mouseY = e.clientY - imgRect.top;
      
      if (mouseX < 0 || mouseX > imgRect.width || 
          mouseY < 0 || mouseY > imgRect.height) {
        magnifier.style.display = 'none';
        return;
      }
      magnifier.style.display = 'block';
      
      // Position magnifier centered on cursor
      magnifier.style.left = `${e.clientX - MAGNIFIER_SIZE/2}px`;
      magnifier.style.top = `${e.clientY - MAGNIFIER_SIZE/2}px`;
      
      // Calculate background position for zoom
      const bgX = (mouseX / imgRect.width) * imgWidth * ZOOM_LEVEL - MAGNIFIER_SIZE/2;
      const bgY = (mouseY / imgRect.height) * imgHeight * ZOOM_LEVEL - MAGNIFIER_SIZE/2;
      
      magnifier.style.backgroundImage = `url('${lightboxImg.src}')`;
      magnifier.style.backgroundSize = `${imgWidth * ZOOM_LEVEL}px ${imgHeight * ZOOM_LEVEL}px`;
      magnifier.style.backgroundPosition = `-${bgX}px -${bgY}px`;
    });
  
    lightboxImg.addEventListener('mouseleave', () => {
      magnifier.style.display = 'none';
    });
  }
  
  // Gallery Filter Functionality
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  if (filterButtons.length > 0) {
    // Add fade animation styles if they don't exist
    if (!document.getElementById('gallery-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'gallery-animation-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .gallery-item {
          transition: opacity 0.3s ease;
        }
        
        .gallery-fade-in {
          animation: fadeIn 0.7s ease-in;
        }
        
        .gallery-hidden {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Make all gallery items visible by default
    if (document.querySelector('.gallery-filter')) {
      document.querySelectorAll('.gallery-item').forEach(item => {
        item.style.display = 'block';
        item.classList.add('gallery-fade-in');
      });
    }
    
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Skip if the button is already active
        if (button.classList.contains('active')) {
          return;
        }
        
        const filter = button.dataset.filter;
        const galleryItems = document.querySelectorAll('.gallery-item');
        
        // Update active filter
        activeFilter = filter;

        // Update active state for buttons
        filterButtons.forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        
        // First, remove animation classes from all items
        galleryItems.forEach(item => {
          item.classList.remove('gallery-fade-in');
        });
        
        // Force a reflow to ensure animations restart
        void document.documentElement.offsetHeight;
        
        // Apply filtering with animation
        galleryItems.forEach(item => {
          // Reset to handle transitions properly
          item.classList.add('gallery-hidden');
          
          // Force reflow again to ensure CSS changes apply
          void item.offsetHeight;
          
          // Show items that match the filter
          if (filter === 'all' || item.classList.contains(filter)) {
            item.classList.remove('gallery-hidden');
            item.classList.add('gallery-fade-in');
          }
        });
        
        // Update gallery images after filtering
        updateGalleryImages();
      });
    });
  }
  
  // Social Media Links
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(btn.href, '_blank');
    });
  });
  
  // Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Hero image load effect
  const heroImage = document.querySelector('#home img');
  if (heroImage) {
    heroImage.onload = () => {
      heroImage.classList.add('loaded');
    };
  }
  
  // Mobile menu
  const hamburgerBtn = document.querySelector('.hamburger-btn');
  const navLinks = document.querySelector('.nav-links');
  const navLeft = document.querySelector('.nav-left');

  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('active');
      hamburgerBtn.classList.toggle('active');
      
      // Update ARIA attributes
      const isExpanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
      hamburgerBtn.setAttribute('aria-expanded', !isExpanded);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navLeft.contains(e.target) && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu when selecting an item
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Cookie Consent Banner
  const cookieBanner = document.getElementById('cookie-banner');
  const acceptButton = document.getElementById('accept-cookies');
  const rejectButton = document.getElementById('reject-cookies');
  
  if (cookieBanner && acceptButton && rejectButton) {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    
    if (cookieConsent === null) {
      // Show banner if no choice has been made
      cookieBanner.style.display = 'block';
    } else if (cookieConsent === 'accepted') {
      // Enable analytics if cookies were accepted
      // This is already handled by your existing analytics code
    } else {
      // Disable analytics if cookies were rejected
      window['ga-disable-G-FEL31JE33S'] = true;
    }
    
    // Handle accept button click
    acceptButton.addEventListener('click', function() {
      localStorage.setItem('cookieConsent', 'accepted');
      cookieBanner.style.display = 'none';
    });
    
    // Handle reject button click
    rejectButton.addEventListener('click', function() {
      localStorage.setItem('cookieConsent', 'rejected');
      window['ga-disable-G-FEL31JE33S'] = true;
      cookieBanner.style.display = 'none';
    });
  }

  // Cookie Policy Modal
  const policyModal = document.getElementById('cookie-policy-modal');
  const policyLink = document.getElementById('open-policy');
  const policyClose = document.querySelector('.policy-close');

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

  // Select all FAQ questions
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  // Add click event listener to each question
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      // Toggle the 'active' class on the clicked question
      question.classList.toggle('active');
      
      // Find the answer element that directly follows the question
      const answer = question.nextElementSibling;
      
      // Ensure the answer is a faq-answer before toggling
      if (answer && answer.classList.contains('faq-answer')) {
        answer.classList.toggle('active');
      }
    });
  });

  // Article progress bar
  const progressBar = document.getElementById('article-progress');
  const article = document.querySelector('.article-content');

  if (progressBar) {
    window.addEventListener('scroll', function() {
      if (article) {
        const windowHeight = window.innerHeight;
        const fullHeight = document.body.offsetHeight;
        const scrolled = window.scrollY;

        // Calculate how far down the page the user has scrolled
        const scrollProgress = (scrolled / (fullHeight - windowHeight)) * 100;

        progressBar.style.width = scrollProgress + '%';
      }
    });
  }

  // Back to Top Button
  const backToTopButton = document.getElementById('back-to-top');

  if (backToTopButton) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 300) {
        backToTopButton.classList.add('visible');
      } else {
        backToTopButton.classList.remove('visible');
      }
    });

    backToTopButton.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // Smooth scroll for TOC links
  document.querySelectorAll('.article-toc-list a').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        const headerOffset = 100;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

// Override navbar title to always use gothic font
  const navTitle = document.querySelector('.nav-center h1');
  if (navTitle) {
    navTitle.style.fontFamily = "'UnifrakturMaguntia', cursive";
  }

  // ACCESSIBILITY CONTROLS - CONSOLIDATED CODE
  // Get all required elements for accessibility features
  const accessibilityToggle = document.querySelector('.accessibility-toggle');
  const accessibilityOptions = document.querySelector('.accessibility-options');
  const accessibilityPanel = document.querySelector('.accessibility-panel');
  const modeToggleBtn = document.getElementById('mode-toggle-btn');
  const highContrastBtn = document.getElementById('high-contrast-btn');
  const fontToggleBtn = document.getElementById('font-toggle-btn');
  
  // Accessibility Panel Toggle
  if (accessibilityToggle && accessibilityOptions && accessibilityPanel) {
    // Initialize panel based on saved state
    const savedPanelState = localStorage.getItem('accessibilityPanelOpen');
    if (savedPanelState === 'true') {
      accessibilityOptions.classList.add('active');
      accessibilityToggle.setAttribute('aria-expanded', 'true');
    }
    
    // Toggle panel visibility
    accessibilityToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      
      accessibilityOptions.classList.toggle('active');
      
      // Update ARIA states
      const isExpanded = accessibilityOptions.classList.contains('active');
      accessibilityToggle.setAttribute('aria-expanded', isExpanded);
      
      // Save state to localStorage
      localStorage.setItem('accessibilityPanelOpen', isExpanded);
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
      if (accessibilityPanel && !accessibilityPanel.contains(e.target) && 
          accessibilityOptions.classList.contains('active')) {
        accessibilityOptions.classList.remove('active');
        accessibilityToggle.setAttribute('aria-expanded', 'false');
        localStorage.setItem('accessibilityPanelOpen', 'false');
      }
    });
  }
  
  // FONT TOGGLE
  if (fontToggleBtn) {
    // Initialize based on saved preference
    const savedFont = localStorage.getItem('website-font');
    if (savedFont === 'roboto') {
      document.body.classList.add('roboto-font');
      fontToggleBtn.classList.add('active');
    }

    // Add click event listener to the toggle button
    fontToggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // Toggle the roboto-font class on the body
      document.body.classList.toggle('roboto-font');
      
      // Toggle active class on button
      fontToggleBtn.classList.toggle('active');

      // Save preference to localStorage
      if (document.body.classList.contains('roboto-font')) {
        localStorage.setItem('website-font', 'roboto');
      } else {
        localStorage.removeItem('website-font');
      }
    });
  }
  
  // MODE TOGGLES (LIGHT/DARK AND HIGH CONTRAST)
  if (modeToggleBtn && highContrastBtn) {
    // Initialize based on saved preferences
    const savedLightMode = localStorage.getItem('color-mode');
    const savedHighContrast = localStorage.getItem('high-contrast-mode');
    
    // Apply saved preferences (high contrast takes precedence)
    if (savedHighContrast === 'enabled') {
      document.body.classList.add('high-contrast-mode');
      highContrastBtn.classList.add('active');
      // Ensure light mode is off
      document.body.classList.remove('light-mode');
      modeToggleBtn.classList.remove('active');
      modeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
    } else if (savedLightMode === 'light') {
      document.body.classList.add('light-mode');
      modeToggleBtn.classList.add('active');
      modeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
    }
    
    // Light/Dark mode toggle handler
    modeToggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // If high contrast is active, turn it off first
      if (document.body.classList.contains('high-contrast-mode')) {
        document.body.classList.remove('high-contrast-mode');
        highContrastBtn.classList.remove('active');
        localStorage.removeItem('high-contrast-mode');
      }
      
      // Then toggle light mode
      document.body.classList.toggle('light-mode');
      
      // Update button state and storage
      if (document.body.classList.contains('light-mode')) {
        modeToggleBtn.classList.add('active');
        modeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
        localStorage.setItem('color-mode', 'light');
      } else {
        modeToggleBtn.classList.remove('active');
        modeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
        localStorage.removeItem('color-mode');
      }
    });
    
    // High contrast toggle handler
    highContrastBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // If in light mode, switch to dark mode first
      if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        modeToggleBtn.classList.remove('active');
        modeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
        localStorage.removeItem('color-mode');
      }
      
      // Then toggle high contrast
      document.body.classList.toggle('high-contrast-mode');
      
      // Update button state and storage
      if (document.body.classList.contains('high-contrast-mode')) {
        highContrastBtn.classList.add('active');
        localStorage.setItem('high-contrast-mode', 'enabled');
      } else {
        highContrastBtn.classList.remove('active');
        localStorage.removeItem('high-contrast-mode');
      }
    });
  }
});

// Set up intersection observer to highlight the current section
// Only initialize if needed
if (document.querySelector('.article-toc-list') && document.querySelector('.article-content')) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // When a section is visible
      if (entry.isIntersecting) {
        // Get its ID
        const id = entry.target.getAttribute('id');
        
        // Remove .active class from all TOC links
        document.querySelectorAll('.article-toc-list a').forEach(link => {
          link.classList.remove('active');
        });
        
        // Add .active class to the corresponding TOC link
        const correspondingLink = document.querySelector(`.article-toc-list a[href="#${id}"]`);
        if (correspondingLink) {
          correspondingLink.classList.add('active');
        }
      }
    });
  }, {
    rootMargin: '-100px 0px -50% 0px', // Adjust these values to control when a section is considered "active"
    threshold: 0
  });

  // Observe all headings in the article content
  document.querySelectorAll('.article-content h2, .article-content h3').forEach(heading => {
    if (heading.id) {
      observer.observe(heading);
    }
  });
}