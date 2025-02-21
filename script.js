document.addEventListener("DOMContentLoaded", function () {
    // ======================
    // Lightbox Functionality
    // ======================
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (lightbox && lightboxImg && closeBtn) {
        // Open lightbox on thumbnail click
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', () => {
                lightbox.style.display = 'flex';
                lightboxImg.src = thumbnail.src;
                lightbox.setAttribute('aria-hidden', 'false');
            });
        });

        // Close lightbox
        const closeLightbox = () => {
            lightbox.style.display = 'none';
            lightbox.setAttribute('aria-hidden', 'true');
        };

        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (lightbox.style.display === 'flex' && e.key === 'Escape') {
                closeLightbox();
            }
        });
    }

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
});