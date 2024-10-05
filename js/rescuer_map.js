document.addEventListener("DOMContentLoaded", function() {
    var map = L.map('mapid').setView([38.246242, 21.735085], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const icons = {
        base: L.icon({ iconUrl: '/images/base_icon.png', iconSize: [32, 32] }),
        vehicle: L.icon({ iconUrl: '/images/vehicle_icon.png', iconSize: [32, 32] }),
        offer_pending: L.icon({ iconUrl: '/images/offer_pending_icon.png', iconSize: [32, 32] }),
        offer_unassigned: L.icon({ iconUrl: '/images/offer_unassigned_icon.png', iconSize: [32, 32] }),
        request_pending: L.icon({ iconUrl: '/images/request_pending_icon.png', iconSize: [32, 32] }),
        request_unassigned: L.icon({ iconUrl: '/images/request_unassigned_icon.png', iconSize: [32, 32] })
    };

    const layers = {
        bases: L.layerGroup(),
        vehicles: L.layerGroup(),
        pendingRequests: L.layerGroup(),
        pendingOffers: L.layerGroup(),
        unassignedRequests: L.layerGroup(),
        unassignedOffers: L.layerGroup(),
        taskLines: L.layerGroup()
    };

    const vehicleMarkers = {}; // Store vehicle markers for easy access

    Object.values(layers).forEach(layer => map.addLayer(layer));

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2 - lat1) * Math.PI/180;
        const Δλ = (lon2 - lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const distance = R * c; // in metres
        return distance;
    }

    function isWithin50Meters(taskLat, taskLng, vehicleLat, vehicleLng) {
        const distance = calculateDistance(taskLat, taskLng, vehicleLat, vehicleLng);
        return distance <= 50;
    }

    function addMarker(item, layer, icon) {
        const marker = L.marker([item.latitude, item.longitude], { icon: icon, draggable: item.type === 'vehicle' }).addTo(layers[layer]);
        marker.bindPopup(() => createPopupContent(item, itemMap));

        if (item.type === 'vehicle') {
            vehicleMarkers[item.id] = marker; // Store the vehicle marker

            marker.on('dragend', function(event) {
                const position = marker.getLatLng();
                if (confirm(`Do you want to update the vehicle location to ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}?`)) {
                    updateVehicleLocation(item.id, position.lat, position.lng, () => {
                        item.latitude = position.lat;
                        item.longitude = position.lng;
                        fetchMapData(); // Refresh the map data after moving the vehicle
                    });
                } else {
                    marker.setLatLng([item.latitude, item.longitude]);
                }
            });
        }

        return marker;
    }

    function createPopupContent(item, itemMap) {
        let content = `<b>${item.type}</b><br>`;
        if (item.type === 'base') {
            content += `Base: ${item.name}`;
        } else if (item.type === 'vehicle') {
            content += `Username: ${item.username}<br>Status: ${item.status}<br>`;
            content += 'Inventory:<br>';
            if (item.inventory && typeof item.inventory === 'object') {
                for (const [itemId, quantity] of Object.entries(item.inventory)) {
                    const itemName = itemMap[itemId] || `Unknown Item (ID: ${itemId})`;
                    content += `- ${itemName}: ${quantity}<br>`;
                }
            } else {
                content += '- Empty<br>';
            }
        } else if (item.type === 'offer' || item.type === 'request') {
            const taskType = item.type;
            const formattedDate = new Date(item.date).toLocaleString(); // Format the date
            content += `ID: ${item.id}<br>`;
            content += `Citizen Name: ${item.citizenName}<br>`;
            content += `Phone: ${item.phone}<br>`;
            content += `Date: ${formattedDate}<br>`; // Use formatted date
            content += `Item: ${item.itemName}<br>`;
            content += `Quantity: ${item.quantity}<br>`;
            if (taskType === 'request') {
                content += `Collection Date: ${item.collectionDate || 'Not yet collected'}<br>`;
            } else {
                content += `Withdrawal Date: ${item.withdrawalDate || 'Not yet withdrawn'}<br>`;
            }
            content += `Status: ${item.status}<br>`;
            if (item.vehicle) {
                content += `Assigned to: Vehicle ${item.vehicle}`;
            }
            if (!item.vehicle_id) {
                content += `<button onclick="assignTask(${item.id}, '${taskType}')">Take Over</button>`;
            }
        }
        return content;
    }

    function updateMap(data) {
        Object.values(layers).forEach(layer => layer.clearLayers());
        layers.taskLines.clearLayers();

        data.bases.forEach(base => {
            base.type = 'base';
            addMarker(base, 'bases', icons.base);
        });

        let vehicleLat, vehicleLng;

        if (data.vehicles) {
            data.vehicles.forEach(vehicle => {
                vehicle.type = 'vehicle';
                vehicleLat = vehicle.latitude;
                vehicleLng = vehicle.longitude;
                addMarker(vehicle, 'vehicles', icons.vehicle);
                drawTaskLines(vehicle, data.offers, data.requests);
            });
        }

        if (data.offers) {
            data.offers.forEach(offer => {
                offer.type = 'offer';
                const icon = offer.vehicle_id ? icons.offer_pending : icons.offer_unassigned;
                const layer = offer.vehicle_id ? 'pendingOffers' : 'unassignedOffers';
                if (offer.status !== 'processed') {
                    addMarker(offer, layer, icon);
                }
            });
        }

        if (data.requests) {
            data.requests.forEach(request => {
                request.type = 'request';
                const icon = request.vehicle_id ? icons.request_pending : icons.request_unassigned;
                const layer = request.vehicle_id ? 'pendingRequests' : 'unassignedRequests';
                if (request.status !== 'processed') {
                    addMarker(request, layer, icon);
                }
            });
        }

        displayTasks([...data.requests, ...data.offers].filter(task => task.vehicle_id));
    }

    function drawTaskLines(vehicle, offers, requests) {
        if (vehicle.assigned_task_id && vehicle.assigned_task_type) {
            const taskIds = vehicle.assigned_task_id.split(',');
            const taskTypes = vehicle.assigned_task_type.split(',');

            taskIds.forEach((taskId, index) => {
                const taskType = taskTypes[index];
                let task;
                if (taskType === 'offer') {
                    task = offers.find(offer => offer.id == taskId);
                } else if (taskType === 'request') {
                    task = requests.find(request => request.id == taskId);
                }

                if (task) {
                    const color = taskType === 'offer' ? 'blue' : 'red';
                    L.polyline([
                        [vehicle.latitude, vehicle.longitude],
                        [task.latitude, task.longitude]
                    ], { color: color, weight: 2, opacity: 0.5 }).addTo(layers.taskLines);
                }
            });
        }
    }

    function updateTaskLines() {
        layers.taskLines.clearLayers();
        data.vehicles.forEach(vehicle => {
            drawTaskLines(vehicle, data.offers, data.requests);
        });
    }

    function assignTask(taskId, taskType) {
        fetch('/api/rescuerMap/vehicle-tasks-count')
            .then(response => response.json())
            .then(data => {
                if (data.taskCount >= 4) {
                    alert('A vehicle can only have up to 4 tasks simultaneously.');
                    return;
                }
                fetch('/api/rescuerMap/assign-task', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ taskId, taskType })
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok ' + response.statusText);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Task assigned:', data);
                        fetchMapData();
                    })
                    .catch(error => console.error('Error assigning task:', error));
            })
            .catch(error => console.error('Error fetching task count:', error));
    }

    let globalData; // Declare a global variable

    function fetchMapData() {
        showLoading();

        fetch('/api/rescuerMap')
            .then(response => response.json())
            .then(data => {
                globalData = data; // Assign the fetched data to the global variable
                updateMap(data);
            })
            .catch(error => console.error('Error fetching map data:', error))
            .finally(() => {
                hideLoading();
            });
    }

    function completeTask(taskId, taskType, data) {
        // Find the task based on the taskId and taskType
        let task = null;
        if (taskType === 'offer') {
            task = data.offers.find(offer => offer.id === taskId);
        } else if (taskType === 'request') {
            task = data.requests.find(request => request.id === taskId);
        }

        // Find the vehicle associated with the user
        const vehicle = data.vehicles.find(vehicle => vehicle.assigned_task_id && vehicle.assigned_task_id.includes(taskId.toString()));

        if (task && vehicle) {
            // Calculate the distance between the vehicle and the task
            const distance = calculateDistance(task.latitude, task.longitude, vehicle.latitude, vehicle.longitude);

            if (distance > 50) {
                alert("Your vehicle is more than 50 meters away from the task location.");
                return;
            }
        }

        fetch('/api/rescuerMap/complete-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskId, taskType })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        console.warn('Server response was not ok:', err);
                        alert(err.error);  // Display the error message in an alert box
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data) {  // Proceed only if data exists (task was successfully completed)
                    console.log('Task completed:', data);
                    fetchMapData();
                }
            })
            .catch(error => {
                console.error('Unexpected error completing task:', error);
            });
    }


    function cancelTask(taskId, taskType) {
        fetch('/api/rescuerMap/cancel-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskId, taskType })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('Task canceled:', data);
                fetchMapData();
            })
            .catch(error => console.error('Error canceling task:', error));
    }

    window.assignTask = assignTask;
    window.completeTask = completeTask;
    window.cancelTask = cancelTask;

    let itemMap = {};

    function fetchMapData() {
        showLoading();

        fetch('/api/rescuerMap')
            .then(response => response.json())
            .then(data => {
                if (data && Array.isArray(data.items)) {
                    itemMap = data.items.reduce((map, item) => {
                        map[item.id] = item.name;
                        return map;
                    }, {});
                } else {
                    console.error('No items data found');
                    itemMap = {}; // Initialize as an empty object if no items data found
                }
                updateMap(data);

                // Attaching the completeTask function to be used in the HTML buttons
                window.completeTask = function(taskId, taskType) {
                    let task = null;
                    if (taskType === 'offer') {
                        task = data.offers.find(offer => offer.id === taskId);
                    } else if (taskType === 'request') {
                        task = data.requests.find(request => request.id === taskId);
                    }

                    const vehicle = data.vehicles.find(vehicle => vehicle.assigned_task_id && vehicle.assigned_task_id.includes(taskId.toString()));

                    if (task && vehicle) {
                        const distance = calculateDistance(task.latitude, task.longitude, vehicle.latitude, vehicle.longitude);

                        if (distance > 50) {
                            alert("Your vehicle is more than 50 meters away from the task location.");
                            return;
                        }
                    }

                    fetch('/api/rescuerMap/complete-task', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ taskId, taskType })
                    })
                        .then(response => {
                            if (!response.ok) {
                                return response.json().then(err => {
                                    console.warn('Server response was not ok:', err);
                                    alert(err.error);  // Display the error message in an alert box
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (data) {  // Proceed only if data exists (task was successfully completed)
                                console.log('Task completed:', data);
                                fetchMapData(); // Refresh the map after completing the task
                            }
                        })
                        .catch(error => {
                            console.error('Unexpected error completing task:', error);
                        });
                };
            })
            .catch(error => console.error('Error fetching map data:', error))
            .finally(() => {
                hideLoading();
            });
    }


    function updateVehicleLocation(vehicleId, lat, lng, callback) {
        fetch(`/api/rescuerMap/vehicles/${vehicleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude: lat, longitude: lng })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('Vehicle location updated:', data);
                if (callback) callback();
                fetchMapData(); // Call the refresh function after updating the vehicle location
            })
            .catch(error => console.error('Error updating vehicle location:', error));
    }

    function showLoading() {
        console.log('Loading...');
    }

    function hideLoading() {
        console.log('Loading complete');
    }

    fetchMapData();
    setInterval(fetchMapData, 30000);

    L.Control.RefreshButton = L.Control.extend({
        onAdd: function(map) {
            var button = L.DomUtil.create('button', 'refresh-button');
            button.innerHTML = '🔄 Refresh';
            button.style.padding = '5px 10px';
            button.style.fontSize = '14px';
            button.style.cursor = 'pointer';

            L.DomEvent.on(button, 'click', function() {
                fetchMapData();
            });

            return button;
        }
    });

    new L.Control.RefreshButton({ position: 'topright' }).addTo(map);

    const overlayMaps = {
        "Bases": layers.bases,
        "Vehicle": layers.vehicles,
        "Pending Requests": layers.pendingRequests,
        "Pending Offers": layers.pendingOffers,
        "Task Lines": layers.taskLines,
        "Unassigned Requests": layers.unassignedRequests,
        "Unassigned Offers": layers.unassignedOffers
    };

    L.control.layers(null, overlayMaps, { position: 'topright' }).addTo(map);
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
function displayTasks(tasks) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    tasks.forEach(task => {
        const taskBox = document.createElement('div');
        taskBox.className = 'task-box';

        const citizenNameRow = document.createElement('div');
        citizenNameRow.className = 'row';
        citizenNameRow.innerHTML = `<span>Citizen Name:</span><span>${task.citizenName}</span>`;

        const phoneRow = document.createElement('div');
        phoneRow.className = 'row';
        phoneRow.innerHTML = `<span>Phone:</span><span>${task.phone}</span>`;

        const dateRow = document.createElement('div');
        dateRow.className = 'row';
        const formattedDate = new Date(task.date).toLocaleString();
        dateRow.innerHTML = `<span>Date of Entry:</span><span>${formattedDate}</span>`;

        const typeRow = document.createElement('div');
        typeRow.className = 'row';
        typeRow.innerHTML = `<span>Type:</span><span>${task.type}</span>`;

        const itemRow = document.createElement('div');
        itemRow.className = 'row';
        itemRow.innerHTML = `<span>Item:</span><span>${task.itemName}</span>`;

        const quantityRow = document.createElement('div');
        quantityRow.className = 'row';
        quantityRow.innerHTML = `<span>Quantity:</span><span>${task.quantity}</span>`;

        const statusRow = document.createElement('div');
        statusRow.className = 'row';
        statusRow.innerHTML = `<span>Status:</span><span>${task.status}</span>`;

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'buttons';
        buttonsDiv.innerHTML = `
            <button class="completed" onclick="completeTask(${task.id}, '${task.type}')">Completed</button>
            <button class="cancelled" onclick="cancelTask(${task.id}, '${task.type}')">Cancel</button>
        `;

        taskBox.appendChild(citizenNameRow);
        taskBox.appendChild(phoneRow);
        taskBox.appendChild(dateRow);
        taskBox.appendChild(typeRow);
        taskBox.appendChild(itemRow);
        taskBox.appendChild(quantityRow);
        taskBox.appendChild(statusRow);
        taskBox.appendChild(buttonsDiv);

        taskList.appendChild(taskBox);
    });

}