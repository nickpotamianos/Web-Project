document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');

    const rescuerForm = document.getElementById('rescuerForm');
    const rescuerMessage = document.getElementById('rescuerMessage');
    const logoutButton = document.getElementById('logoutButton');
    const vehicleAssignment = document.getElementById('vehicleAssignment');
    const rescuerList = document.getElementById('rescuerList');
    const editRescuerModal = document.getElementById('editRescuerModal');
    const editRescuerForm = document.getElementById('editRescuerForm');
    const editVehicleAssignment = document.getElementById('editVehicleAssignment');
    const closeModalButton = editRescuerModal.querySelector('.close');

    if (!rescuerForm || !vehicleAssignment || !rescuerList || !editRescuerModal || !editRescuerForm || !editVehicleAssignment) {
        console.error('Required elements not found in the DOM');
        return;
    }

    // Fetch and display rescuer accounts
    function fetchRescuerAccounts() {
        fetch('/api/rescuers')
            .then(response => response.json())
            .then(rescuers => {
                rescuerList.innerHTML = '';
                rescuers.forEach(rescuer => {
                    const rescuerDiv = document.createElement('div');
                    rescuerDiv.className = 'rescuer-item';
                    rescuerDiv.innerHTML = `
                    <h5>${rescuer.first_name} ${rescuer.last_name}</h5>
                    <p>Email: ${rescuer.email}</p>
                    <p>Phone: ${rescuer.phone}</p>
                    <p>Vehicle: ${rescuer.vehicle_name || 'Unassigned'}</p>
                    <button class="edit-rescuer" data-id="${rescuer.id}">Edit</button>
                    <button class="delete-rescuer" data-id="${rescuer.id}">Delete</button>
                `;
                    rescuerList.appendChild(rescuerDiv);
                });

                // Add event listeners to edit buttons
                document.querySelectorAll('.edit-rescuer').forEach(button => {
                    button.addEventListener('click', function() {
                        const rescuerId = this.getAttribute('data-id');
                        openEditModal(rescuerId);
                    });
                });

                // Add event listeners to delete buttons
                document.querySelectorAll('.delete-rescuer').forEach(button => {
                    button.addEventListener('click', function() {
                        const rescuerId = this.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this rescuer?')) {
                            deleteRescuer(rescuerId);
                        }
                    });
                });
            })
            .catch(error => console.error('Error fetching rescuer accounts:', error));
    }

    fetchRescuerAccounts();

    function openEditModal(rescuerId) {
        fetch(`/api/rescuers/${rescuerId}`)
            .then(response => response.json())
            .then(rescuer => {
                document.getElementById('editRescuerId').value = rescuer.id;
                document.getElementById('editRescuerEmail').value = rescuer.email;
                document.getElementById('editRescuerFirstName').value = rescuer.first_name;
                document.getElementById('editRescuerLastName').value = rescuer.last_name;
                document.getElementById('editRescuerPhone').value = rescuer.phone;

                const editVehicleAssignment = document.getElementById('editVehicleAssignment');



                // Populate vehicle options
                populateVehicleOptions(editVehicleAssignment);

                // Set the correct value after populating options
                if (rescuer.vehicle_id) {
                    editVehicleAssignment.value = rescuer.vehicle_id;
                } else {
                    editVehicleAssignment.value = '';
                }

                editRescuerModal.style.display = 'block';
            })
            .catch(error => console.error('Error fetching rescuer details:', error));
    }

    function populateVehicleOptions(selectElement) {
        fetch('/api/rescuers/vehicles/all')
            .then(response => response.json())
            .then(vehicles => {
                // Clear existing options
                selectElement.innerHTML = `
                  <option value="">Select a vehicle</option>
            <option value="unassigned">Unassigned</option>
            <option value="new">Assign to New Vehicle</option>
            `;

                // Create a Set to store unique vehicle IDs
                const addedVehicles = new Set();

                vehicles.forEach(vehicle => {
                    // Only add the vehicle if it hasn't been added yet
                    if (!addedVehicles.has(vehicle.id)) {
                        const option = document.createElement('option');
                        option.value = vehicle.id;
                        option.textContent = vehicle.name + (vehicle.user_id ? ' (Assigned)' : '');
                        selectElement.appendChild(option);
                        addedVehicles.add(vehicle.id);
                    }
                });
            })
            .catch(error => console.error('Error fetching vehicles:', error));
    }

    populateVehicleOptions(vehicleAssignment);
    populateVehicleOptions(editVehicleAssignment);
    // Close modal when clicking on <span> (x)
    closeModalButton.onclick = function() {
        editRescuerModal.style.display = 'none';
    }

    // Close modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == editRescuerModal) {
            editRescuerModal.style.display = 'none';
        }
    }

    function deleteRescuer(rescuerId) {
        fetch(`/api/rescuers/${rescuerId}`, {
            method: 'DELETE',
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.warn('The response was not JSON:', text);
                    data = { message: text };
                }

                if (data.error) {
                    alert('Error deleting rescuer: ' + data.error);
                } else {
                    alert('Rescuer account deleted successfully!');
                    fetchRescuerAccounts(); // Refresh the list
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting the account.');
            });
    }

    editRescuerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const rescuerId = document.getElementById('editRescuerId').value;
        const formData = {
            email: document.getElementById('editRescuerEmail').value,
            firstName: document.getElementById('editRescuerFirstName').value,
            lastName: document.getElementById('editRescuerLastName').value,
            phone: document.getElementById('editRescuerPhone').value,
            vehicleAssignment: document.getElementById('editVehicleAssignment').value
        };

        // If "Unassigned" is selected, set vehicleAssignment to null
        if (formData.vehicleAssignment === "") {
            formData.vehicleAssignment = null;
        }

        console.log('Sending data:', formData); // Add this line for debugging

        fetch(`/api/rescuers/${rescuerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error updating rescuer: ' + data.error);
                } else {
                    alert('Rescuer account updated successfully!');
                    editRescuerModal.style.display = 'none';
                    fetchRescuerAccounts(); // Refresh the list
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the account.');
            });
    });

    rescuerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submitted');

        const email = document.getElementById('rescuerEmail').value.trim();
        const password = document.getElementById('rescuerPassword').value.trim();
        const firstName = document.getElementById('rescuerFirstName').value.trim();
        const lastName = document.getElementById('rescuerLastName').value.trim();
        const phone = document.getElementById('rescuerPhone').value.trim();
        const vehicleAssignmentValue = vehicleAssignment.value;

        // Validation
        let errors = [];

        if (!email || !password || !firstName || !lastName || !phone) {
            errors.push("Please fill in all fields.");
        }

        if (!vehicleAssignmentValue) {
            errors.push("Please select a vehicle assignment option.");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push("Please enter a valid email address.");
        }

        if (password.length < 8) {
            errors.push("Password must be at least 8 characters long.");
        }

        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phone)) {
            errors.push("Please enter a valid phone number.");
        }

        if (errors.length > 0) {
            rescuerMessage.innerHTML = errors.join('<br>');
            rescuerMessage.className = 'alert alert-danger';
            return;
        }

        const formData = {
            email,
            password,
            firstName,
            lastName,
            phone,
            vehicleAssignment: vehicleAssignmentValue
        };

        console.log('Sending data:', formData);

        fetch('/api/create-rescuer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                if (data.error) {
                    rescuerMessage.textContent = 'Error: ' + data.error;
                    rescuerMessage.className = 'alert alert-danger';
                } else {
                    rescuerMessage.textContent = 'Rescuer account created successfully!';
                    rescuerMessage.className = 'alert alert-success';
                    rescuerForm.reset();
                    fetchRescuerAccounts(); // Refresh the list
                }
            })
            .catch(error => {
                console.error('Error:', error);
                rescuerMessage.textContent = 'An error occurred while creating the account.';
                rescuerMessage.className = 'alert alert-danger';
            });
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log('Logout button clicked');
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