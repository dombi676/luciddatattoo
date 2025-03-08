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

    // Close lightbox
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
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
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
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
    // Google Analytics
    // ======================
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-FEL31JE33S');

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
            hamburgerBtn.classList.toggle('active'); // Add this line to toggle the active class on the button
            
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
});