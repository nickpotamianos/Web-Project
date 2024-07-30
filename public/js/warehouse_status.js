document.addEventListener('DOMContentLoaded', function() {
    const categoryFilter = document.getElementById('category-filter');
    const warehouseTable = document.getElementById('warehouse-table').getElementsByTagName('tbody')[0];
    let warehouseData = { categories: [], items: [] };

    function fetchWarehouseData() {
        fetch('/api/warehouse-status')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Received data:', data);
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid data received from server');
                }
                warehouseData = {
                    categories: data.categories || [],
                    items: data.items || []
                };
                populateCategoryFilter();
                updateWarehouseTable();
            })
            .catch(error => {
                console.error('Error fetching warehouse data:', error);
                displayErrorMessage('Failed to load warehouse data. Please try again later.');
            });
    }

    function populateCategoryFilter() {
        categoryFilter.innerHTML = '<h2>Filter by Category:</h2>';
        if (warehouseData.categories.length === 0) {
            categoryFilter.innerHTML += '<p>No categories available</p>';
            return;
        }
        warehouseData.categories.forEach(category => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `category-${category.id}`;
            checkbox.value = category.id;
            checkbox.checked = true;
            checkbox.addEventListener('change', updateWarehouseTable);

            const label = document.createElement('label');
            label.htmlFor = `category-${category.id}`;
            label.textContent = category.name;

            const div = document.createElement('div');
            div.appendChild(checkbox);
            div.appendChild(label);

            categoryFilter.appendChild(div);
        });
    }

    function updateWarehouseTable() {
        warehouseTable.innerHTML = '';
        const selectedCategories = Array.from(document.querySelectorAll('#category-filter input:checked')).map(cb => cb.value);

        const filteredItems = warehouseData.items.filter(item => selectedCategories.includes(item.category_id.toString()));

        if (filteredItems.length === 0) {
            const row = warehouseTable.insertRow();
            row.innerHTML = '<td colspan="5">No items available</td>';
            return;
        }

        filteredItems.forEach(item => {
            const row = warehouseTable.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category_name}</td>
                <td>${item.quantity_in_base}</td>
                <td>${item.quantity_in_vehicles}</td>
                <td>${item.total_quantity}</td>
            `;
        });
    }

    function displayErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }

    fetchWarehouseData();
});