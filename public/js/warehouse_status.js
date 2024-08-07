document.addEventListener('DOMContentLoaded', function() {
    const categoryFilter = document.getElementById('category-filter');
    const warehouseTable = document.getElementById('warehouse-table');
    const warehouseTableBody = warehouseTable.getElementsByTagName('tbody')[0];
    const warehouseTableHead = warehouseTable.getElementsByTagName('thead')[0];
    let warehouseData = { categories: [], items: [] };
    let currentSort = { column: 'name', direction: 'asc' };

    function getCategoryNickname(categoryId) {
        if (typeof window.getCategoryNickname === 'function') {
            return window.getCategoryNickname(categoryId);
        }
        return `Category ${categoryId}`;
    }

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
                setupTableHeader();
                updateWarehouseTable();
            })
            .catch(error => {
                console.error('Error fetching warehouse data:', error);
                displayErrorMessage('Failed to load warehouse data. Please try again later.');
            });
    }

    function populateCategoryFilter() {
        categoryFilter.innerHTML = `
        <h3>Filter by Category <span id="toggle-filter">▼</span></h3>
        <div id="category-list" class="checkbox-group" style="display: none;">
        </div>
    `;
        const categoryList = document.getElementById('category-list');
        if (warehouseData.categories.length === 0) {
            categoryList.innerHTML = '<p>No categories available</p>';
            return;
        }

        // Sort categories by name
        warehouseData.categories.sort((a, b) => {
            const nameA = getCategoryNickname(a.id).toUpperCase();
            const nameB = getCategoryNickname(b.id).toUpperCase();
            return nameA.localeCompare(nameB);
        });

        warehouseData.categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
            <input type="checkbox" id="category-${category.id}" value="${category.id}" checked>
            <label for="category-${category.id}">${getCategoryNickname(category.id)}</label>
        `;
            categoryList.appendChild(div);
        });

        document.querySelectorAll('#category-list input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', updateWarehouseTable);
        });

        document.getElementById('toggle-filter').addEventListener('click', function() {
            const categoryList = document.getElementById('category-list');
            const displayStyle = categoryList.style.display;
            categoryList.style.display = displayStyle === 'none' ? 'grid' : 'none';
            this.textContent = displayStyle === 'none' ? '▲' : '▼';
        });
    }

    function setupTableHeader() {
        const headerRow = warehouseTableHead.getElementsByTagName('tr')[0];
        const headers = headerRow.getElementsByTagName('th');
        const columns = ['name', 'category', 'quantity_in_base', 'quantity_in_vehicles', 'total_quantity'];

        for (let i = 0; i < headers.length; i++) {
            headers[i].innerHTML += ' <span class="sort-indicator"></span>';
            headers[i].addEventListener('click', () => {
                const column = columns[i];
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                updateWarehouseTable();
            });
        }
    }

    function updateWarehouseTable() {
        warehouseTableBody.innerHTML = '';
        const selectedCategories = Array.from(document.querySelectorAll('#category-list input:checked')).map(cb => cb.value);

        let filteredItems = warehouseData.items.filter(item => selectedCategories.includes(item.category_id.toString()));

        // Sort items based on currentSort
        filteredItems.sort((a, b) => {
            let valueA = a[currentSort.column];
            let valueB = b[currentSort.column];

            if (currentSort.column === 'category') {
                valueA = getCategoryNickname(a.category_id);
                valueB = getCategoryNickname(b.category_id);
            }

            if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }

            if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        if (filteredItems.length === 0) {
            const row = warehouseTableBody.insertRow();
            row.innerHTML = '<td colspan="5">No items available</td>';
            return;
        }

        filteredItems.forEach(item => {
            const row = warehouseTableBody.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${getCategoryNickname(item.category_id)}</td>
                <td>${item.quantity_in_base}</td>
                <td>${item.quantity_in_vehicles}</td>
                <td>${item.total_quantity}</td>
            `;
        });

        // Update sort indicators in the header
        const headers = warehouseTableHead.getElementsByTagName('th');
        const columns = ['name', 'category', 'quantity_in_base', 'quantity_in_vehicles', 'total_quantity'];
        for (let i = 0; i < headers.length; i++) {
            const indicator = headers[i].querySelector('.sort-indicator');
            indicator.textContent = '';
            if (columns[i] === currentSort.column) {
                indicator.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
            }
        }
    }

    function displayErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }

    fetchWarehouseData();
});