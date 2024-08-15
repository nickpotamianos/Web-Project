document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('categorySelect');
    const itemSelect = document.getElementById('itemSelect');
    const itemSearch = document.getElementById('itemSearch');
    const autocompleteList = document.getElementById('autocomplete-list');
    const requestOfferForm = document.getElementById('requestOfferForm');
    const requestOfferMessage = document.getElementById('requestOfferMessage');
    const logoutButton = document.getElementById('logoutButton');
    const tasksTableBody = document.getElementById('tasksTableBody');
    let formSubmitting = false; // Flag to prevent double submission

    // Fetch categories and populate the dropdown
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = getCategoryNickname(category.id); // Use the global function to get category name
                categorySelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching categories:', error));

    // Fetch items based on selected category
    categorySelect.addEventListener('change', function() {
        const categoryId = this.value;
        if (categoryId) {
            fetch(`/api/categories/${categoryId}/items`)
                .then(response => response.json())
                .then(items => {
                    itemSelect.innerHTML = '<option value="">-- Select an Item --</option>'; // Clear previous items
                    items.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = item.name;
                        itemSelect.appendChild(option);
                    });
                })
                .catch(error => console.error('Error fetching items:', error));
        } else {
            itemSelect.innerHTML = '<option value="">-- Select an Item --</option>'; // Clear items if no category selected
        }
    });

    // Autocomplete search with suggestion
    itemSearch.addEventListener('input', function() {
        const searchQuery = this.value.toLowerCase();
        if (searchQuery.length > 2) {  // Start search after at least 3 characters
            fetch(`/api/items?search=${searchQuery}`)
                .then(response => response.json())
                .then(items => {
                    autocompleteList.innerHTML = ''; // Clear previous suggestions
                    items.forEach(item => {
                        if (item.name.toLowerCase().includes(searchQuery)) {  // Check if item matches the query
                            const listItem = document.createElement('li');
                            listItem.textContent = item.name;
                            listItem.addEventListener('click', function() {
                                itemSearch.value = item.name;
                                itemSelect.innerHTML = `<option value="${item.id}">${item.name}</option>`;
                                autocompleteList.innerHTML = ''; // Clear suggestions after selection
                            });
                            autocompleteList.appendChild(listItem);
                        }
                    });
                })
                .catch(error => console.error('Error fetching items:', error));
        } else {
            autocompleteList.innerHTML = ''; // Clear suggestions if query is too short
        }
    });

    // Prevent default form submission and handle it via JavaScript
    requestOfferForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent the default form submission

        if (formSubmitting) return; // Prevent multiple submissions
        formSubmitting = true; // Set flag to true after first submission

        const itemId = itemSelect.value;
        const quantity = document.getElementById('itemQuantity').value.trim();
        const latitude = document.getElementById('latitude').value.trim();
        const longitude = document.getElementById('longitude').value.trim();

        // Validate form inputs
        if (!itemId || !quantity || !latitude || !longitude) {
            requestOfferMessage.textContent = 'Please fill all fields including item, quantity, latitude, and longitude.';
            requestOfferMessage.style.color = 'red';
            formSubmitting = false; // Reset flag on error
            return;
        }

        // Check if quantity is an integer
        if (!Number.isInteger(Number(quantity))) {
            requestOfferMessage.textContent = 'Please enter a valid integer for the number of people.';
            requestOfferMessage.style.color = 'red';
            formSubmitting = false; // Reset flag on error
            return;
        }

        // Check if latitude and longitude are valid decimal numbers
        const decimalPattern = /^[+-]?(\d*\.\d+|\d+\.?\d*)$/;
        if (!decimalPattern.test(latitude) || !decimalPattern.test(longitude)) {
            requestOfferMessage.textContent = 'Please enter valid decimal numbers for latitude and longitude.';
            requestOfferMessage.style.color = 'red';
            formSubmitting = false; // Reset flag on error
            return;
        }

        const submitButton = requestOfferForm.querySelector('button[type="submit"]');
        submitButton.disabled = true; // Disable the submit button to prevent double-clicks

        const apiUrl = `/api/citizen_operations/RequestTask`;

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ itemId, quantity, latitude, longitude }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    requestOfferMessage.textContent = 'Error: ' + data.error;
                    requestOfferMessage.style.color = 'red';
                } else {
                    requestOfferMessage.textContent = `Request created successfully!`;
                    requestOfferMessage.style.color = 'green';
                    requestOfferForm.reset(); // Reset form fields
                    fetchUserTasks(); // Refresh tasks after submission
                }
                formSubmitting = false; // Reset flag after successful submission
                submitButton.disabled = false; // Re-enable the button
            })
            .catch(error => {
                console.error('Error:', error);
                requestOfferMessage.textContent = `An error occurred while creating the request.`;
                requestOfferMessage.style.color = 'red';
                formSubmitting = false; // Reset flag on error
                submitButton.disabled = false; // Re-enable the button
            });
    });

    // Fetch and display the user's tasks
    function fetchUserTasks() {
        fetch('/api/citizen_operations/citizen_tasks')
            .then(response => response.json())
            .then(tasks => {
                tasksTableBody.innerHTML = ''; // Clear existing rows

                tasks.forEach(task => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${task.id}</td>
                        <td>${task.item_name}</td>
                        <td>${task.quantity}</td>
                        <td>${formatDate(task.date_registered)}</td>
                        <td>${task.date_collected ? formatDate(task.date_collected) : 'N/A'}</td>
                        <td>${task.status || ''}</td>
                    `;
                    tasksTableBody.appendChild(row);
                });
            })
            .catch(error => console.error('Error fetching tasks:', error));
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString(); // Formats the date to the user's locale
    }

    fetchUserTasks(); // Initial call to load tasks

    // Logout functionality
    if (logoutButton) {
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
    } else {
        console.error('Logout button not found');
    }
});