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
  let isChangingImage = false;
  let isTouchDevice = false;
  
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
      progressBar.style.display = 'block';
      
      lightbox.appendChild(progressBar);
    } else {
      // Reset progress
      progressBar.style.width = '0%';
      progressBar.style.display = 'block';
    }
    
    return progressBar;
  }
  
  // SUPER SIMPLE image opening function
  function openLightbox(index) {
    if (isChangingImage) return;
    isChangingImage = true;
    
    // Update gallery images
    updateGalleryImages();
    
    if (index < 0 || index >= galleryImages.length) {
      isChangingImage = false;
      return;
    }
    
    currentIndex = index;
    
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
    
    // IMPORTANT: Force the image to be visible immediately
    lightboxImg.style.opacity = '1';
    
    // Show initial image (WebP if available, otherwise compressed)
    lightboxImg.src = webpPath || compressedPath;
    lightboxImg.alt = img.alt || 'Imagen ampliada';
    
    // Create progress bar
    const progressBar = getProgressBar();
    
    // Set up a simple XHR to track loading progress
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uncompressedPath, true);
    xhr.responseType = 'blob';
    
    // Track progress
    xhr.onprogress = function(e) {
      if (e.lengthComputable) {
        const percentComplete = Math.floor((e.loaded / e.total) * 100);
        progressBar.style.width = `${percentComplete}%`;
      }
    };
    
    // When high-res image loads
    xhr.onload = function() {
      if (xhr.status === 200) {
        // Switch to uncompressed image
        lightboxImg.src = uncompressedPath;
        progressBar.style.display = 'none';
        
        // Reset changing flag when image loads
        lightboxImg.onload = function() {
          isChangingImage = false;
        };
        
        lightboxImg.onerror = function() {
          // On error, keep the initial image and hide progress
          progressBar.style.display = 'none';
          isChangingImage = false;
        };
      } else {
        // On error, keep the initial image and hide progress
        progressBar.style.display = 'none';
        isChangingImage = false;
      }
    };
    
    xhr.onerror = function() {
      // On error, keep the initial image and hide progress
      progressBar.style.display = 'none';
      isChangingImage = false;
    };
    
    xhr.send();
  }
  
  // Navigation functions
  function prevImage() {
    if (isChangingImage) return;
    updateGalleryImages();
    currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    openLightbox(currentIndex);
  }
  
  function nextImage() {
    if (isChangingImage) return;
    updateGalleryImages();
    currentIndex = (currentIndex + 1) % galleryImages.length;
    openLightbox(currentIndex);
  }
  
  // Close lightbox
  function closeLightbox() {
    lightbox.style.display = 'none';
    
    // Reset/hide progress bar
    const progressBar = document.getElementById('lightbox-progress');
    if (progressBar) {
      progressBar.style.display = 'none';
      progressBar.style.width = '0%';
    }
    
    // Reset image properties and state
    setTimeout(() => {
      lightboxImg.src = '';
      isChangingImage = false;
    }, 100);
  }
  
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