document.addEventListener('DOMContentLoaded', function() {
    const loadButton = document.getElementById('load-button');
    const unloadButton = document.getElementById('unload-button');

    if (!loadButton || !unloadButton) return;

    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'fixed-buttons-container';
    buttonsContainer.style.position = 'fixed';
    buttonsContainer.style.bottom = '20px';
    buttonsContainer.style.right = '20px';
    buttonsContainer.style.display = 'none';
    buttonsContainer.style.flexDirection = 'column';
    buttonsContainer.style.gap = '10px';
    buttonsContainer.style.zIndex = '1000';

    // Create new buttons for the fixed container
    const fixedLoadButton = loadButton.cloneNode(true);
    fixedLoadButton.id = 'fixed-load-button';
    const fixedUnloadButton = unloadButton.cloneNode(true);
    fixedUnloadButton.id = 'fixed-unload-button';

    buttonsContainer.appendChild(fixedLoadButton);
    buttonsContainer.appendChild(fixedUnloadButton);

    document.body.appendChild(buttonsContainer);

    // Attach event listeners to new fixed buttons
    fixedLoadButton.addEventListener('click', window.loadButtonHandler);
    fixedUnloadButton.addEventListener('click', window.unloadButtonHandler);

    // Show/hide fixed buttons based on scroll position
    window.addEventListener('scroll', function() {
        if (window.scrollY > 450) {
            buttonsContainer.style.display = 'flex';
        } else {
            buttonsContainer.style.display = 'none';
        }
    });
});