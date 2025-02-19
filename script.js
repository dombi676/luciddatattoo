// script.js
// Lightbox functionality
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.close');
const thumbnails = document.querySelectorAll('.thumbnail');

// Open lightbox when a thumbnail is clicked
thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('click', () => {
        lightbox.style.display = 'flex';
        lightboxImg.src = thumbnail.src;
    });
});

// Close lightbox when the close button is clicked
closeBtn.addEventListener('click', () => {
    lightbox.style.display = 'none';
});

// Close lightbox when clicking outside the image
lightbox.addEventListener('click', (e) => {
    if (e.target !== lightboxImg) {
        lightbox.style.display = 'none';
    }
});