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
  let navigationLock = false;
  let isTouchDevice = false;
  let activeXHRs = {}; // Track active XHRs by index
  let blobCache = {}; // Cache for created blob URLs
  let loadingStates = {}; // Track loading states to prevent duplicate loads
  
  try {
    document.createEvent("TouchEvent");
    isTouchDevice = true;
  } catch (e) {
    isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;
  }

  // Initialize gallery images
  function updateGalleryImages() {
    galleryImages = Array.from(document.querySelectorAll('.thumbnail'));
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
  
  // Open lightbox with specific image
  function openLightbox(index) {
    if (navigationLock) return;
    navigationLock = true;
    
    // Cancel any previous image onload handlers
    lightboxImg.onload = null;
    
    // Update gallery images
    updateGalleryImages();
    
    if (index < 0 || index >= galleryImages.length) {
      navigationLock = false;
      return;
    }
    
    currentIndex = index;
    
    // Mark all other images as not currently viewed
    markAllXHRsAsNotCurrentlyViewed();
    
    // Get the thumbnail
    const img = galleryImages[currentIndex];
    
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
    
    // Initial state of image
    lightboxImg.style.opacity = '0.3';
    
    const progressBar = getProgressBar();
    progressBar.style.width = '0%';
    progressBar.style.display = 'none';
    
    // Check if we have a cached blob URL for this image
    if (blobCache[index]) {
      // Use cached blob URL
      lightboxImg.src = blobCache[index];
      lightboxImg.alt = img.alt || 'Imagen ampliada';
      
      // Once the image is loaded from cache, we can unlock navigation
      lightboxImg.onload = function() {
        lightboxImg.style.opacity = '1';
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
        navigationLock = false;
        
        // Now start downloading the high-res version if not already loading/loaded
        if (!loadingStates[index]) {
          loadHighResImage(index, uncompressedPath);
        }
      };
    }
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
    // Cancel any onload handlers
    lightboxImg.onload = null;
    
    // Mark all XHRs as not being viewed
    markAllXHRsAsNotCurrentlyViewed();
    
    // Load the previous image
    updateGalleryImages();
    const nextIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    openLightbox(nextIndex);
  }
  
  function nextImage() {
    // Cancel any onload handlers
    lightboxImg.onload = null;
    
    // Mark all XHRs as not being viewed
    markAllXHRsAsNotCurrentlyViewed();
    
    // Load the next image
    updateGalleryImages();
    const nextIndex = (currentIndex + 1) % galleryImages.length;
    openLightbox(nextIndex);
  }
  
  // Close lightbox and cleanup
  function closeLightbox() {
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
        openLightbox(index);
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
  closeButton.addEventListener('click', () => {
    closeLightbox();
  });
  
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
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
  if (!isTouchDevice) {
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
  
  // Touch swipe functionality
  let touchStartX = 0;
  let touchEndX = 0;

  function checkSwipeDirection() {
    if (touchEndX < touchStartX - 50) {
      // Swiped left, go to next image
      nextImage();
    }
    
    if (touchEndX > touchStartX + 50) {
      // Swiped right, go to previous image
      prevImage();
    }
  }

  if (lightboxImg) {
    lightboxImg.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });
    
    lightboxImg.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      checkSwipeDirection();
    });
  }
  
  // =====================
  // Gallery Filter Functionality
  // =====================
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  if (filterButtons.length > 0) {
    // Make all gallery items visible by default
    if (document.querySelector('.gallery-filter')) {
      document.querySelectorAll('.gallery-item').forEach(item => {
        item.style.display = 'block';
      });
    }
    
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        const galleryItems = document.querySelectorAll('.gallery-item');

        // Filter items
        galleryItems.forEach(item => {
          item.style.display = (filter === 'all' || item.classList.contains(filter)) 
            ? 'block' 
            : 'none';
        });

        // Update active state
        filterButtons.forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        
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
});