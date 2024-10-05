document.addEventListener('DOMContentLoaded', () => {
    const itemForm = document.getElementById('itemForm');
    const itemCategory = document.getElementById('itemCategory');
    const categoryForm = document.getElementById('categoryForm');
    const categoryList = document.getElementById('categoryList');
    const logoutButton = document.getElementById('logoutButton');


    const categoryNicknames = {
        49: 'Animal Care',
        29: 'Animal Food',
        25: 'Baby Essentials',
        6: 'Beverages',
        59: 'Books',
        22: 'Cleaning Supplies',
        33: 'Cleaning Supplies.',
        7: 'Clothing',
        53: 'Clothing and cover',
        28: 'Cold weather',
        45: 'Communication items',
        46: 'communications',
        44: 'Disability and Assistance Items',
        50: 'Earthquake Safety',
        27: 'Electronic Devices',
        43: 'Energy Drinks',
        30: 'Financial support',
        35: 'First Aid',
        14: 'Flood',
        5: 'Food',
        60: 'Fuel and Energy',
        8: 'Hacker of class',
        34: 'Hot Weather',
        57: 'Household Items',
        47: 'Humanitarian Shelters',
        26: 'Insect Repellents',
        24: 'Kitchen Supplies',
        16: 'Medical Supplies',
        52: 'Navigation Tools',
        15: 'new cat',
        21: 'Personal Hygiene',
        41: 'pet supplies',
        19: 'Shoes',
        51: 'Sleep Essentials',
        56: 'Special items',
        23: 'Tools',
        54: 'Tools and Equipment',
        48: 'Water Purification',
        42: 'Medicines',
        10: '', // Blank category name
        13: '-----', // Placeholder category
        9: '2d hacker',
        66: 'Animal Flood',
        70: 'Car Supplies',
        68: 'Mental Health Support',
        65: 'ood', // Potential typo?
        72: 'Ready-To-Eat Meals',
        69: 'Sanitary Products',
        67: 'Solar-Powered Devices',
        11: 'Test',
        61: 'test category',
        40: 'test1',
        39: 'Test_0',
        71: 'Thermal Clothing',
        73: 'Toys'
    };

    window.getCategoryNickname = function(categoryId) {
        return categoryNicknames[categoryId] || `Category ${categoryId}`;
    };

    function loadCategories() {
        if (!categoryList || !itemCategory) return;

        fetch('/api/categories')
            .then(response => response.json())
            .then(data => {
                itemCategory.innerHTML = '';
                categoryList.innerHTML = '';
                data.forEach(category => {
                    const categoryName = categoryNicknames[category.id] || category.name;

                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = categoryName;
                    itemCategory.appendChild(option);

                    const div = document.createElement('div');
                    div.className = 'category';
                    div.innerHTML = `
                        <span>${categoryName}</span>
                        <button class="delete-category" data-id="${category.id}">Delete Category</button>
                    `;
                    div.addEventListener('click', (event) => {
                        if (event.target.classList.contains('delete-category')) {
                            deleteCategory(event);
                        } else {
                            toggleCategoryItems(category.id);
                        }
                    });
                    categoryList.appendChild(div);

                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'item-container';
                    itemContainer.id = `category-${category.id}`;
                    itemContainer.style.display = 'none';
                    categoryList.appendChild(itemContainer);
                });
            })
            .then(loadItems) // Ensure items are loaded after categories
            .catch(error => console.error('Error fetching categories:', error));
    }

    if (categoryForm) {
        categoryForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const categoryName = document.getElementById('categoryName');
            if (!categoryName) return;

            fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: categoryName.value })
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Category added successfully:', data);
                    loadCategories();
                })
                .catch(error => {
                    console.error('Error adding category:', error);
                });
        });
    }

    if (itemForm) {
        itemForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const itemName = document.getElementById('itemName');
            const itemQuantity = document.getElementById('itemQuantity');
            const itemDetailsInput = document.getElementById('itemDetails');
            if (!itemName || !itemQuantity || !itemCategory || !itemDetailsInput) return;

            const details = itemDetailsInput.value.split(',').map(detail => {
                const [name, value] = detail.split(':').map(s => s.trim());
                return { detail_name: name, detail_value: value };
            }).filter(detail => detail.detail_name && detail.detail_value);

            const itemData = {
                name: itemName.value,
                category_id: itemCategory.value,
                quantity: itemQuantity.value,
                details: details
            };

            fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Item added successfully:', data);
                    loadItems();
                })
                .catch(error => console.error('Error adding item:', error));
        });
    }

    function loadItems() {
        fetch('/api/items')
            .then(response => response.json())
            .then(data => {
                const itemsByCategory = data.reduce((acc, item) => {
                    acc[item.category_id] = acc[item.category_id] || [];
                    acc[item.category_id].push(item);
                    return acc;
                }, {});

                for (const [category, items] of Object.entries(itemsByCategory)) {
                    const itemContainer = document.getElementById(`category-${category}`);
                    if (itemContainer) {
                        itemContainer.innerHTML = '';

                        items.forEach(item => {
                            const itemDiv = document.createElement('div');
                            itemDiv.className = 'item';
                            itemDiv.style.display = 'grid';
                            itemDiv.style.gridTemplateColumns = '2fr 1fr 1fr 1fr 1fr 1fr';
                            itemDiv.style.gap = '10px';
                            itemDiv.style.alignItems = 'center';

                            const details = item.details && item.details.length > 0
                                ? item.details.map(detail => `${detail.detail_name}: ${detail.detail_value}`).join(', ')
                                : 'No details available';

                            itemDiv.innerHTML = `
                                <span>${item.name}</span>
                                <input type="number" class="item-quantity" data-id="${item.id}" value="${item.quantity}" style="width: 60px;">
                                <span>${details}</span>
                                <button class="update-quantity" data-id="${item.id}">Update</button>
                                <button class="update-details" data-id="${item.id}">Update Details</button>
                                <button class="delete-item" data-id="${item.id}">Delete</button>
                            `;
                            itemContainer.appendChild(itemDiv);
                        });

                        if (items.length > 0) {
                            itemContainer.style.display = 'block';
                        }
                    }
                }

                document.querySelectorAll('.update-quantity').forEach(button => {
                    button.addEventListener('click', updateItemQuantity);
                });

                document.querySelectorAll('.delete-item').forEach(button => {
                    button.addEventListener('click', deleteItem);
                });

                document.querySelectorAll('.update-details').forEach(button => {
                    button.addEventListener('click', openUpdateDetailsPopup);
                });
            })
            .catch(error => console.error('Error fetching items:', error));
    }

    function openUpdateDetailsPopup(event) {
        const itemId = event.target.getAttribute('data-id');
        fetch('/api/items')
            .then(response => response.json())
            .then(items => {
                const item = items.find(i => i.id == itemId);
                if (!item) {
                    throw new Error('Item not found');
                }
                const popup = document.createElement('div');
                popup.className = 'popup';
                popup.style.display = 'block';
                popup.style.position = 'fixed';
                popup.style.top = '0';
                popup.style.left = '0';
                popup.style.width = '100%';
                popup.style.height = '100%';
                popup.style.backgroundColor = 'rgba(0,0,0,0.5)';
                popup.style.zIndex = '1000';
                popup.innerHTML = `
                <div class="popup-content" style="background-color: white; padding: 20px; margin: 50px auto; width: 50%; max-width: 500px;">
                    <h3>Edit Item Details</h3>
                    <form id="editDetailsForm" data-item-id="${itemId}">
                        <div id="editDetailsFields"></div>
                        <button type="button" id="addDetailButton">Add Detail</button>
                        <button type="submit" id="submitUpdate" style="background-color: green;">Update Details</button>
                        <button type="button" id="closePopup">Cancel</button>
                    </form>
                </div>
            `;
                document.body.appendChild(popup);

                const editDetailsFields = popup.querySelector('#editDetailsFields');
                const editDetailsForm = popup.querySelector('#editDetailsForm');
                const closePopup = popup.querySelector('#closePopup');
                const addDetailButton = popup.querySelector('#addDetailButton');

                function createDetailInput(detail, index) {
                    const detailContainer = document.createElement('div');
                    detailContainer.style.display = 'flex';
                    detailContainer.style.marginBottom = '10px';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.name = `detail_${index}`;
                    input.value = detail ? `${detail.detail_name}: ${detail.detail_value}` : 'New Detail: Value';
                    input.style.flexGrow = '1';

                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.textContent = 'Delete';
                    deleteButton.style.marginLeft = '5px';
                    deleteButton.addEventListener('click', () => {
                        editDetailsFields.removeChild(detailContainer);
                    });

                    detailContainer.appendChild(input);
                    detailContainer.appendChild(deleteButton);
                    return detailContainer;
                }

                if (item.details && item.details.length > 0) {
                    item.details.forEach((detail, index) => {
                        editDetailsFields.appendChild(createDetailInput(detail, index));
                    });
                } else {
                    editDetailsFields.appendChild(createDetailInput(null, 0));
                }

                addDetailButton.addEventListener('click', () => {
                    const newIndex = editDetailsFields.children.length;
                    editDetailsFields.appendChild(createDetailInput(null, newIndex));
                });

                editDetailsForm.addEventListener('submit', updateItemDetails);
                closePopup.addEventListener('click', () => {
                    document.body.removeChild(popup);
                });
            })
            .catch(error => {
                console.error('Error fetching item details:', error);
                alert('Failed to load item details. Please try again.');
            });
    }

    function updateItemQuantity(event) {
        const itemId = event.target.getAttribute('data-id');
        const itemQuantityInput = document.querySelector(`.item-quantity[data-id="${itemId}"]`);
        const newQuantity = itemQuantityInput.value;

        fetch(`/api/items/${itemId}/quantity`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity: newQuantity })
        })
            .then(response => response.json())
            .then(data => {
                console.log('Item quantity updated successfully:', data);
                loadItems(); // Refresh the items list
            })
            .catch(error => console.error('Error updating item quantity:', error));
    }

    function updateItemDetails(event) {
        event.preventDefault();
        const itemId = event.target.getAttribute('data-item-id');
        const updatedDetails = Array.from(event.target.querySelectorAll('input')).map(input => {
            const [name, value] = input.value.split(':').map(str => str.trim());
            return { detail_name: name, detail_value: value };
        });

        fetch(`/api/items/${itemId}/details`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ details: updatedDetails })
        })
            .then(response => response.json())
            .then(data => {
                document.body.removeChild(event.target.closest('.popup'));
                loadItems();
            })
            .catch(error => console.error('Error updating item details:', error));
    }

    function deleteItem(event) {
        const itemId = event.target.getAttribute('data-id');

        if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            fetch(`/api/items/${itemId}`, {
                method: 'DELETE'
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to delete item');
                    }
                    return response.json();
                })
                .then(data => {
                    const itemElement = document.querySelector(`button.delete-item[data-id="${itemId}"]`).closest('.item');
                    if (itemElement) {
                        itemElement.remove();
                    }
                    loadItems(); // Refresh the item list
                })
                .catch(error => {
                    console.error('Error deleting item:', error);
                    alert('Failed to delete item. Please try again.');
                });
        }
    }

    function deleteCategory(event) {
        const categoryId = event.target.getAttribute('data-id');

        if (confirm('Are you sure you want to delete this category? This will also delete all items in this category.')) {
            fetch(`/api/categories/${categoryId}`, {
                method: 'DELETE'
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to delete category');
                    }
                    return response.json();
                })
                .then(data => {
                    const categoryElement = document.querySelector(`button.delete-category[data-id="${categoryId}"]`).parentElement;
                    const itemContainer = document.getElementById(`category-${categoryId}`);
                    categoryElement.remove(); // Remove the category from the DOM
                    itemContainer.remove(); // Remove the items container from the DOM
                })
                .catch(error => {
                    console.error('Error deleting category:', error);
                    alert('Failed to delete category. Please try again.');
                });
        }
    }

    function toggleCategoryItems(categoryId) {
        const itemContainer = document.getElementById(`category-${categoryId}`);
        if (itemContainer) {
            itemContainer.style.display = itemContainer.style.display === 'none' ? 'block' : 'none';
        }
    }

    if (document.getElementById('uploadForm')) {
        document.getElementById('uploadForm').addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData();
            const fileInput = document.getElementById('jsonFile');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file');
                return;
            }

            formData.append('jsonFile', file);

            fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'Database populated successfully from file') {
                        alert('File uploaded and database populated successfully');
                        loadCategories(); // Reload categories, which will also call loadItems
                    } else {
                        alert('Error uploading file: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to upload file');
                });
        });
    }

    if (document.getElementById('clearFileButton')) {
        document.getElementById('clearFileButton').addEventListener('click', function() {
            const fileInput = document.getElementById('jsonFile');
            fileInput.value = ''; // Clear the file input
        });
    }

    if (document.getElementById('loadFromUrlButton')) {
        document.getElementById('loadFromUrlButton').addEventListener('click', function() {
            fetch('/api/populate')
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'Database populated successfully') {
                        alert('Data loaded successfully from URL');
                        loadCategories(); // Reload categories, which will also call loadItems
                    } else {
                        alert('Error loading data from URL');
                    }
                })
                .catch(error => console.error('Error:', error));
        });
    }

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
    }

// Add logout functionality for mobile
    const logoutMobile = document.getElementById('logoutMobile');
    if (logoutMobile) {
        logoutMobile.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
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
    }

    if (categoryList && itemCategory) {
        loadCategories();
    }
});
