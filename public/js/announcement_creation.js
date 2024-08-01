document.addEventListener('DOMContentLoaded', function() {
    const announcementForm = document.getElementById('announcementForm');
    const announcementMessage = document.getElementById('announcementMessage');
    const itemSelection = document.getElementById('itemSelection');
    const logoutButton = document.getElementById('logoutButton');

    // Fetch items and populate checkboxes
    fetch('/api/items')
        .then(response => response.json())
        .then(items => {
            items.forEach(item => {
                const checkboxItem = document.createElement('div');
                checkboxItem.className = 'checkbox-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `item-${item.id}`;
                checkbox.name = 'items';
                checkbox.value = item.id;

                const label = document.createElement('label');
                label.htmlFor = `item-${item.id}`;
                label.textContent = item.name;

                checkboxItem.appendChild(checkbox);
                checkboxItem.appendChild(label);
                itemSelection.appendChild(checkboxItem);
            });
        })
        .catch(error => {
            console.error('Error fetching items:', error);
            announcementMessage.textContent = 'Error loading items. Please try again later.';
            announcementMessage.style.color = 'red';
        });

    announcementForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const title = document.getElementById('announcementTitle').value.trim();
        const description = document.getElementById('announcementDescription').value.trim();
        const selectedItems = Array.from(document.querySelectorAll('input[name="items"]:checked')).map(cb => cb.value);

        if (!title || !description || selectedItems.length === 0) {
            announcementMessage.textContent = 'Please fill in all fields and select at least one item.';
            announcementMessage.style.color = 'red';
            return;
        }

        fetch('/api/announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, description, itemIds: selectedItems }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    announcementMessage.textContent = 'Error: ' + data.error;
                    announcementMessage.style.color = 'red';
                } else {
                    announcementMessage.textContent = 'Announcement created successfully!';
                    announcementMessage.style.color = 'green';
                    announcementForm.reset();
                    // Uncheck all checkboxes
                    document.querySelectorAll('input[name="items"]:checked').forEach(cb => cb.checked = false);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                announcementMessage.textContent = 'An error occurred while creating the announcement.';
                announcementMessage.style.color = 'red';
            });
    });

    logoutButton.addEventListener('click', function() {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/login.html';
                } else {
                    alert('Logout failed');
                }
            })
            .catch(error => console.error('Error logging out:', error));
    });
});