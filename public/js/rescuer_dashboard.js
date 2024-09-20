document.addEventListener('DOMContentLoaded', () => {
    const vehicleList = document.getElementById('vehicle-list');
    const itemsList = document.getElementById('items-list');
    const loadButton = document.getElementById('load-button');
    const unloadButton = document.getElementById('unload-button');

    let vehicleData;
    let itemsData;
    let itemMap = {};
    let baseCoordinates;



    // Function to display vehicle info
    function displayVehicleInfo() {
        vehicleList.innerHTML = ''; // Clear existing content

        const headerRow = document.createElement('li');
        headerRow.innerHTML = `
        <div>ID</div>
        <div>Name</div>
        <div>Status</div>
        <div>(Item ID) Inventory</div>
        <div>Assigned Task ID</div>
        <div>Assigned Task Type</div>
    `;
        headerRow.classList.add('header-row');
        vehicleList.appendChild(headerRow);
        if (vehicleData) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div>${vehicleData.id}</div>
                <div>${vehicleData.name}</div>
                <div>${vehicleData.status}</div>
                <div></div>
                <div>${vehicleData.assigned_task_id}</div>
                <div>${vehicleData.assigned_task_type}</div>
            `;

            // Parse inventory and replace item IDs with names, including ID in parentheses
            const inventory = JSON.parse(vehicleData.inventory || '{}');
            let inventoryText = '';
            for (const [itemId, quantity] of Object.entries(inventory)) {
                if (itemMap[itemId]) {
                    inventoryText += `(${itemId}) ${itemMap[itemId]}: ${quantity}, `;
                }
            }
            listItem.children[3].innerText = inventoryText.slice(0, -2); // Remove the last comma and space
            vehicleList.appendChild(listItem);
        } else {
            const listItem = document.createElement('li');
            listItem.innerHTML = '<div colspan="6">No vehicle assigned</div>';
            vehicleList.appendChild(listItem);
        }
    }

    // Fetch base coordinates
    const baseCoordPromise = fetch('/api/rescuer/base-coordinates')
        .then(response => response.json())
        .then(data => {
            baseCoordinates = data;
        })
        .catch(error => console.error('Error fetching base coordinates:', error));

    // Fetch items and build the itemMap
    const itemsPromise = fetch('/api/rescuer/items')
        .then(response => response.json())
        .then(data => {
            itemsData = data.items || data;
            if (Array.isArray(itemsData)) {
                itemsList.innerHTML = ''; // Clear existing items

                // Create and append the header row
                const headerRow = document.createElement('li');
                headerRow.innerHTML = `
                    <div>ID</div>
                    <div>Name</div>
                    <div>Category</div>
                    <div>Quantity</div>
                `;
                headerRow.classList.add('header-row');
                itemsList.appendChild(headerRow);

                // Create and append data rows
                itemsData.forEach(item => {
                    itemMap[item.id] = item.name;
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <div>${item.id}</div>
                        <div>${item.name}</div>
                        <div>${window.getCategoryNickname(item.category_id)}</div>
                        <div>${item.quantity}</div>
                    `;
                    itemsList.appendChild(listItem);
                });
            } else {
                console.error('Unexpected API response format:', data);
            }
        })
        .catch(error => console.error('Error fetching items:', error));

    // Fetch vehicle info
    const vehiclePromise = fetch('/api/rescuer/vehicle-info')
        .then(response => response.json())
        .then(data => {
            vehicleData = data.vehicle;
        })
        .catch(error => console.error('Error fetching vehicle info:', error));

    // Wait for all data to be fetched before displaying
    Promise.all([baseCoordPromise, itemsPromise, vehiclePromise])
        .then(() => {
            displayVehicleInfo();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

    // Calculate the distance between two coordinates using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180; // φ, λ in radians
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2 - lat1) * Math.PI/180;
        const Δλ = (lon2 - lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const d = R * c; // in metres
        return d;
    }

    // Check if vehicle is within 100 meters of the base
    function isWithin100Meters() {
        if (!baseCoordinates || !vehicleData) {
            return false;
        }
        const distance = calculateDistance(baseCoordinates.latitude, baseCoordinates.longitude, vehicleData.latitude, vehicleData.longitude);
        return distance <= 100;
    }

    window.loadButtonHandler = () => {
        if (!isWithin100Meters()) {
            alert('Your vehicle is more than 100m away from the base.');
            return;
        }

        const itemId = prompt('Enter the item ID to load:');
        if (itemId) {
            // Check if the item ID exists
            if (!itemMap[itemId]) {
                alert('Item does not exist');
                return;
            }
            const quantity = prompt('Enter the quantity to load:');
            if (quantity && parseInt(quantity) > 0 && Number.isInteger(parseFloat(quantity))) {
                fetch('/api/rescuer/load-items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ itemId, quantity }),
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            alert(data.error);
                        } else {
                            alert(data.message);
                            location.reload(); // Reload to see updated inventory
                        }
                    })
                    .catch(error => console.error('Error loading items:', error));
            } else {
                alert('Quantity must be a positive integer.');
            }
        }
    };

    window.unloadButtonHandler = () => {
        if (!isWithin100Meters()) {
            alert('Your vehicle is more than 100m away from the base.');
            return;
        }

        const itemId = prompt('Enter the item ID to unload:');
        if (itemId) {
            // Check if the item ID exists
            if (!itemMap[itemId]) {
                alert('Item does not exist');
                return;
            }
            const quantity = prompt('Enter the quantity to unload:');
            if (quantity && parseInt(quantity) > 0 && Number.isInteger(parseFloat(quantity))) {
                fetch('/api/rescuer/unload-items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ itemId, quantity }),
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            alert(data.error);
                        } else {
                            alert(data.message);
                            location.reload(); // Reload to see updated inventory
                        }
                    })
                    .catch(error => console.error('Error unloading items:', error));
            } else {
                alert('Quantity must be a positive integer.');
            }
        }
    };

    loadButton.addEventListener('click', window.loadButtonHandler);
    unloadButton.addEventListener('click', window.unloadButtonHandler);

    // Add event listener to the map link
    document.querySelector('nav a[href="/rescuer_dashboard/rescuerMap.html"]').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/rescuer_dashboard/rescuerMap.html';
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