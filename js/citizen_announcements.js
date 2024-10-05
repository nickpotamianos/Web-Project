document.addEventListener('DOMContentLoaded', function() {
    const announcementsContainer = document.getElementById('announcementsContainer');
    const offerModal = document.getElementById('offerModal');
    const offerItemName = document.getElementById('offerItemName');
    const offerForm = document.getElementById('offerForm');
    const offersTableBody = document.getElementById('offersTableBody');
    const locationSelect = document.getElementById('locationSelect');
    const newAddressField = document.getElementById('newAddressField');
    const logoutButton = document.getElementById('logoutButton');
    let selectedItemId = null;
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
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            userRegisteredLatitude = data.latitude;
            userRegisteredLongitude = data.longitude;
            userLocationFetched = true;
            console.log('User location fetched:', data);
        })
        .catch(error => {
            console.error('Error fetching user location:', error);
            userLocationFetched = true; // Set to true even on error to allow form submission
        });

    // Fetch and display announcements and related items
    fetch('/api/citizen_offers/announcements')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(announcements => {
            announcements.forEach(announcement => {
                const announcementDiv = document.createElement('div');
                announcementDiv.className = 'announcement';

                const title = document.createElement('h3');
                title.textContent = announcement.title;

                const description = document.createElement('p');
                description.textContent = announcement.description;

                const datePosted = document.createElement('p');
                datePosted.textContent = `Posted on: ${new Date(announcement.date_posted).toLocaleDateString()}`;

                const itemList = document.createElement('ul');
                announcement.items.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = item.name;

                    // Offer button
                    const offerButton = document.createElement('button');
                    offerButton.textContent = 'Offer for this item';
                    offerButton.onclick = function() {
                        openOfferModal(item.id, item.name);
                    };
                    listItem.appendChild(offerButton);

                    itemList.appendChild(listItem);
                });

                announcementDiv.appendChild(title);
                announcementDiv.appendChild(description);
                announcementDiv.appendChild(datePosted);
                announcementDiv.appendChild(itemList);

                announcementsContainer.appendChild(announcementDiv);
            });
        })
        .catch(error => console.error('Error fetching announcements:', error));

    // Fetch and display user's offers
    function fetchOffers() {
        fetch('/api/citizen_offers/offers')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(offers => {
                offersTableBody.innerHTML = ''; // Clear existing offers
                offers.forEach(offer => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${offer.id}</td>
                        <td>${offer.item_name}</td>
                        <td>${offer.quantity}</td>
                        <td>${new Date(offer.date_registered).toLocaleString()}</td>
                        <td>${offer.status}</td>
                        <td>${offer.withdrawal_date ? new Date(offer.withdrawal_date).toLocaleString() : 'N/A'}</td>
                    `;

                    // Check if the offer status is 'unassigned' to display the cancel button
                    if (offer.status === 'unassigned') {
                        const cancelButton = document.createElement('button');
                        cancelButton.textContent = 'Cancel';
                        cancelButton.onclick = function() {
                            cancelOffer(offer.id);
                        };
                        const cancelButtonCell = document.createElement('td');
                        cancelButtonCell.appendChild(cancelButton);
                        row.appendChild(cancelButtonCell);
                    } else {
                        // Add an empty cell where the cancel button would normally go
                        row.innerHTML += `<td></td>`;
                    }

                    offersTableBody.appendChild(row);
                });
            })
            .catch(error => console.error('Error fetching offers:', error));
    }

    // Function to cancel the offer
    function cancelOffer(offerId) {
        if (confirm('Are you sure you want to cancel this offer?')) {
            fetch(`/api/citizen_offers/cancel_offer/${offerId}`, {
                method: 'DELETE'
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    alert('Offer cancelled successfully!');
                    fetchOffers(); // Refresh the list of offers
                })
                .catch(error => console.error('Error cancelling offer:', error));
        }
    }

    // Function to open the offer modal
    function openOfferModal(itemId, itemName) {
        selectedItemId = itemId;
        offerItemName.textContent = `Offering: ${itemName}`;
        offerModal.style.display = 'block';
    }

    // Toggle address field visibility based on location option
    locationSelect.addEventListener('change', function() {
        if (this.value === 'new') {
            newAddressField.style.display = 'block';
        } else {
            newAddressField.style.display = 'none';
        }
    });

    // Handle form submission
    offerForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const quantity = document.getElementById('quantity').value;
        const locationOption = locationSelect.value;
        const newAddress = document.getElementById('newAddress').value.trim();

        if (!quantity || (locationOption === 'new' && !newAddress)) {
            alert('Please fill all required fields.');
            return;
        }

        if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
            alert('Please enter a valid positive integer for the quantity.');
            return;
        }

        if (locationOption === 'registered') {
            // Check if user location has been fetched
            if (!userLocationFetched) {
                alert('User location is still being fetched. Please try again in a moment.');
                return;
            }
            // Use registered address
            if (userRegisteredLatitude && userRegisteredLongitude) {
                submitOffer(selectedItemId, quantity, userRegisteredLatitude, userRegisteredLongitude);
            } else {
                alert('Could not retrieve your registered location. Please try using a new address.');
            }
        } else {
            // Geocode the new address
            geocoder.geocode(newAddress, function(results) {
                if (results.length > 0) {
                    const latitude = results[0].center.lat;
                    const longitude = results[0].center.lng;
                    submitOffer(selectedItemId, quantity, latitude, longitude);
                } else {
                    alert('Could not find coordinates for the given address.');
                }
            });
        }
    });

    function submitOffer(itemId, quantity, latitude, longitude) {
        fetch('/api/citizen_offers/offer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                itemId: itemId,
                quantity: quantity,
                latitude: latitude,
                longitude: longitude
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                alert('Offer submitted successfully!');
                fetchOffers();
                closeOfferModal();
            })
            .catch(error => {
                console.error('Error submitting offer:', error);
                alert('Error submitting offer. Please try again.');
            });
    }

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

    // Initial fetch of offers
    fetchOffers();
});

// Define the closeOfferModal function
function closeOfferModal() {
    offerModal.style.display = 'none';
    offerForm.reset();
}