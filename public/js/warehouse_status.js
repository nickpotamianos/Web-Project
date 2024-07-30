document.addEventListener('DOMContentLoaded', function() {
    const categoryFilter = document.getElementById('category-filter');
    const warehouseTable = document.getElementById('warehouse-table').getElementsByTagName('tbody')[0];

    function fetchWarehouseData() {
        fetch('/api/warehouse-status')
            .then(response => response.json())
            .then(data => {
                populateCategoryFilter(data.categories);
                populateWarehouseTable(data.items);
            })
            .catch(error => console.error('Error fetching warehouse data:', error));
    }

    function populateCategoryFilter(categories) {
        categoryFilter.innerHTML = '';
        categories.forEach(category => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `category-${category.id}`;
            checkbox.value = category.id;
            checkbox.checked = true;
            checkbox.addEventListener('change', updateTable);

            const label = document.createElement('label');
            label.htmlFor = `category-${category.id}`;
            label.textContent = category.name;

            categoryFilter.appendChild(checkbox);
            categoryFilter.appendChild(label);
        });
    }

    function populateWarehouseTable(items) {
        warehouseTable.innerHTML = '';
        items.forEach(item => {
            if (document.getElementById(`category-${item.category_id}`).checked) {
                const row = warehouseTable.insertRow();
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.category_name}</td>
                    <td>${item.quantity_in_base}</td>
                    <td>${item.quantity_in_vehicles}</td>
                    <td>${item.quantity_in_base + item.quantity_in_vehicles}</td>
                `;
            }
        });
    }

    function updateTable() {
        const items = JSON.parse(warehouseTable.dataset.items);
        populateWarehouseTable(items);
    }

    fetchWarehouseData();
});