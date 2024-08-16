document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('categorySelect');
    const itemSelect = document.getElementById('itemSelect');
    const itemSearch = document.getElementById('itemSearch');
    const autocompleteList = document.getElementById('autocomplete-list');
    const requestOfferForm = document.getElementById('requestOfferForm');
    const requestOfferMessage = document.getElementById('requestOfferMessage');
    const logoutButton = document.getElementById('logoutButton');
    const tasksTableBody = document.getElementById('tasksTableBody');
    const locationSelect = document.getElementById('locationSelect');
    const newAddressField = document.getElementById('newAddressField');
    let formSubmitting = false;
    let userRegisteredLatitude, userRegisteredLongitude;
    let userLocationFetched = false;

    // Initialize Leaflet geocoder
    const geocoder = L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            countrycodes: 'gr',
            viewbox: '19.3736,34.8021,28.2336,41.7488',
            bounded: 1
        }
    });

    // Fetch user's registered location
    fetch('/api/user/location')
        .then(response => response.json())
        .then(data => {
            userRegisteredLatitude = data.latitude;
            userRegisteredLongitude = data.longitude;
            userLocationFetched = true;
            console.log('User location fetched:', data);
        })
        .catch(error => {
            console.error('Error fetching user location:', error);
            userLocationFetched = true; // Set to true even on error to allow form submission
        });

    // Fetch categories and populate the dropdown
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            categorySelect.innerHTML = '<option value="">-- Select a Category --</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = window.getCategoryNickname(category.id);
                categorySelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching categories:', error));

    // Modify the category change event listener
    categorySelect.addEventListener('change', function() {
        const categoryId = this.value;
        if (categoryId) {
            fetch(`/api/categories/${categoryId}/items`)
                .then(response => response.json())
                .then(items => {
                    itemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
                    items.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = item.name;
                        itemSelect.appendChild(option);
                    });
                    // If there's a currently selected item, try to keep it selected
                    const currentItemId = itemSelect.value;
                    if (currentItemId) {
                        const matchingOption = itemSelect.querySelector(`option[value="${currentItemId}"]`);
                        if (matchingOption) {
                            matchingOption.selected = true;
                        }
                    }
                })
                .catch(error => console.error('Error fetching items:', error));
        } else {
            itemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
        }
    });

    // Toggle address field visibility based on location option
    locationSelect.addEventListener('change', function() {
        if (this.value === 'new') {
            newAddressField.style.display = 'block';
        } else {
            newAddressField.style.display = 'none';
        }
    });

    // Autocomplete search with suggestion
    // Autocomplete search with suggestion
    itemSearch.addEventListener('input', function() {
        const searchQuery = this.value.toLowerCase();
        if (searchQuery.length > 2) {
            fetch(`/api/items?search=${searchQuery}`)
                .then(response => response.json())
                .then(items => {
                    autocompleteList.innerHTML = '';
                    items.forEach(item => {
                        if (item.name.toLowerCase().includes(searchQuery)) {
                            const listItem = document.createElement('li');
                            listItem.textContent = item.name;
                            listItem.addEventListener('click', function() {
                                itemSearch.value = item.name;

                                // Update category dropdown without triggering change event
                                updateCategoryDropdown(item.category_id, false);

                                // Update item dropdown
                                updateItemDropdown(item.id, item.name);

                                autocompleteList.innerHTML = '';
                            });
                            autocompleteList.appendChild(listItem);
                        }
                    });
                })
                .catch(error => console.error('Error fetching items:', error));
        } else {
            autocompleteList.innerHTML = '';
        }
    });

    // Function to update category dropdown
    // Function to update category dropdown
    function updateCategoryDropdown(categoryId, triggerChange = true) {
        const options = categorySelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value == categoryId) {
                categorySelect.selectedIndex = i;
                if (triggerChange) {
                    // Trigger change event on categorySelect
                    const event = new Event('change');
                    categorySelect.dispatchEvent(event);
                }
                break;
            }
        }
    }

// Function to update item dropdown
    function updateItemDropdown(itemId, itemName) {
        itemSelect.innerHTML = `<option value="${itemId}">${itemName}</option>`;
        itemSelect.value = itemId;
    }

    // Handle form submission
    requestOfferForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (formSubmitting) return;
        formSubmitting = true;

        const itemId = itemSelect.value;
        const quantity = document.getElementById('itemQuantity').value.trim();
        const locationOption = locationSelect.value;
        const newAddress = document.getElementById('newAddress').value.trim();

        if (!itemId || !quantity || (locationOption === 'new' && !newAddress)) {
            requestOfferMessage.textContent = 'Please fill all required fields.';
            requestOfferMessage.style.color = 'red';
            formSubmitting = false;
            return;
        }

        if (!Number.isInteger(Number(quantity))) {
            requestOfferMessage.textContent = 'Please enter a valid integer for the number of people.';
            requestOfferMessage.style.color = 'red';
            formSubmitting = false;
            return;
        }

        const submitButton = requestOfferForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        if (locationOption === 'registered') {
            // Check if user location has been fetched
            if (!userLocationFetched) {
                requestOfferMessage.textContent = 'User location is still being fetched. Please try again in a moment.';
                requestOfferMessage.style.color = 'red';
                formSubmitting = false;
                submitButton.disabled = false;
                return;
            }
            // Use registered address
            if (userRegisteredLatitude && userRegisteredLongitude) {
                submitRequest(itemId, quantity, userRegisteredLatitude, userRegisteredLongitude);
            } else {
                requestOfferMessage.textContent = 'Could not retrieve your registered location. Please try using a new address.';
                requestOfferMessage.style.color = 'red';
                formSubmitting = false;
                submitButton.disabled = false;
            }
        } else {
            // Geocode the new address
            geocoder.geocode(newAddress, function(results) {
                if (results.length > 0) {
                    const latitude = results[0].center.lat;
                    const longitude = results[0].center.lng;
                    submitRequest(itemId, quantity, latitude, longitude);
                } else {
                    requestOfferMessage.textContent = 'Could not find coordinates for the given address.';
                    requestOfferMessage.style.color = 'red';
                    formSubmitting = false;
                    submitButton.disabled = false;
                }
            });
        }
    });

    function submitRequest(itemId, quantity, latitude, longitude) {
        const apiUrl = `/api/citizen_operations/RequestTask`;

        console.log('Submitting request with data:', { itemId, quantity, latitude, longitude });

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

                    // Reset form and dropdowns
                    requestOfferForm.reset();
                    resetDropdowns();

                    fetchUserTasks();
                }
                formSubmitting = false;
                requestOfferForm.querySelector('button[type="submit"]').disabled = false;
            })
            .catch(error => {
                console.error('Error:', error);
                requestOfferMessage.textContent = `An error occurred while creating the request.`;
                requestOfferMessage.style.color = 'red';
                formSubmitting = false;
                requestOfferForm.querySelector('button[type="submit"]').disabled = false;
            });
    }

    function resetDropdowns() {
        // Reset category dropdown
        categorySelect.innerHTML = '<option value="">-- Select a Category --</option>';
        fetch('/api/categories')
            .then(response => response.json())
            .then(categories => {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = window.getCategoryNickname(category.id);
                    categorySelect.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching categories:', error));

        // Reset item dropdown
        itemSelect.innerHTML = '<option value="">-- Select an Item --</option>';

        // Clear the item search input and autocomplete list
        itemSearch.value = '';
        autocompleteList.innerHTML = '';
    }

    // Fetch and display user's tasks
    function fetchUserTasks() {
        fetch('/api/citizen_operations/citizen_tasks')
            .then(response => response.json())
            .then(tasks => {
                tasksTableBody.innerHTML = '';
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
        return date.toLocaleString();
    }

    fetchUserTasks();

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