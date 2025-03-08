document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const magnifier = document.getElementById('magnifier');
    const ZOOM_LEVEL = 1.2;
    const MAGNIFIER_SIZE = 400;
    let isTouchDevice = false;

    // Check if touch device
    try {
        document.createEvent("TouchEvent");
        isTouchDevice = true;
    } catch (e) {
        isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;
    }

    // Lightbox open/close
    document.querySelectorAll('.thumbnail').forEach(img => {
        img.addEventListener('click', (e) => {
            const compressedPath = img.src;
            const fileExtension = compressedPath.split('.').pop().toLowerCase();
            const uncompressedPath = compressedPath
                .replace('/compressed/', '/uncompressed/')
                .replace(/\.(jpg|jpeg|png)$/i, `.${fileExtension}`);

            lightboxImg.src = uncompressedPath;
            lightbox.style.display = 'flex';
            magnifier.style.display = 'none';
        });
    });

    // Only enable magnifier for non-touch devices
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

// Find and replace your existing lightbox close event with this:
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('close')) {
      lightbox.style.display = 'none';
    }
  });

    document.querySelector('.close').addEventListener('click', () => {
        lightbox.style.display = 'none';
    });
    
    // ======================
    // Gallery Filter Functionality
    // ======================
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
            });
        });
    }

    // ======================
    // Social Media Links
    // ======================
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(btn.href, '_blank');
        });
    });

    // ======================
    // Smooth Scroll
    // ======================
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

    const heroImage = document.querySelector('#home img');
    if (heroImage) {
        heroImage.onload = () => {
            heroImage.classList.add('loaded');
        };
    }

    // Fixed hamburger menu functionality
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
            
            // Prevent body scrolling when menu is open
            if (!isExpanded) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLeft.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });

        // Close menu when selecting an item
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
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
// Lightbox navigation
const prevButton = document.querySelector('.lightbox-nav.prev');
const nextButton = document.querySelector('.lightbox-nav.next');
let currentIndex = 0;
let galleryImages = [];

// Function to open lightbox with specific image
function openLightbox(index) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  galleryImages = Array.from(thumbnails);
  
  if (index >= 0 && index < galleryImages.length) {
    currentIndex = index;
    const img = galleryImages[currentIndex];
    const compressedPath = img.src;
    const fileExtension = compressedPath.split('.').pop().toLowerCase();
    const uncompressedPath = compressedPath
      .replace('/compressed/', '/uncompressed/')
      .replace(/\.(jpg|jpeg|png)$/i, `.${fileExtension}`);
    
    lightboxImg.src = uncompressedPath;
    lightbox.style.display = 'flex';
    magnifier.style.display = 'none';
  }
}

// Update thumbnail click event to use the index
document.querySelectorAll('.thumbnail').forEach((img, index) => {
  img.addEventListener('click', () => {
    openLightbox(index);
  });
});

// Navigate to previous image
function prevImage() {
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  openLightbox(currentIndex);
}

// Navigate to next image
function nextImage() {
  currentIndex = (currentIndex + 1) % galleryImages.length;
  openLightbox(currentIndex);
}

// Add click events for navigation buttons
if (prevButton && nextButton) {
  prevButton.addEventListener('click', (e) => {
    e.stopPropagation();
    prevImage();
  });
  
  nextButton.addEventListener('click', (e) => {
    e.stopPropagation();
    nextImage();
  });
}

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
  if (lightbox.style.display === 'flex') {
    if (e.key === 'ArrowLeft') {
      prevImage();
    } else if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'Escape') {
      lightbox.style.display = 'none';
    }
  }
});

// Touch swipe functionality for mobile
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
});