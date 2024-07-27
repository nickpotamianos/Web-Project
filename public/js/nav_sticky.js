document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('nav');
    let stickyNavHeight = nav.offsetHeight; // Get the initial height of the nav
    let stickyNavPlaceholder = document.createElement('div');
    stickyNavPlaceholder.style.display = 'none';
    nav.parentNode.insertBefore(stickyNavPlaceholder, nav.nextSibling); // Insert the placeholder

    window.addEventListener('scroll', () => {
        if (window.scrollY > nav.offsetTop) {
            if (!nav.classList.contains('sticky')) {
                stickyNavPlaceholder.style.display = 'block';
                stickyNavPlaceholder.style.height = `${stickyNavHeight}px`; // Placeholder takes the height of the nav
                nav.classList.add('sticky');
            }
        } else {
            if (nav.classList.contains('sticky')) {
                stickyNavPlaceholder.style.display = 'none'; // Placeholder is hidden
                nav.classList.remove('sticky');
            }
        }
    });
});
