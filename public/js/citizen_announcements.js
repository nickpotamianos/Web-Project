document.addEventListener('DOMContentLoaded', function() {
    const announcementsContainer = document.getElementById('announcementsContainer');
    const offerModal = document.getElementById('offerModal');
    const offerItemName = document.getElementById('offerItemName');
    const offerForm = document.getElementById('offerForm');
    const offersTableBody = document.getElementById('offersTableBody');
    let selectedItemId = null;



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
    fetch('/api/citizen_offers/offers')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(offers => {
            offers.forEach(offer => {
                const row = document.createElement('tr');

                const idCell = document.createElement('td');
                idCell.textContent = offer.id;
                row.appendChild(idCell);

                const itemNameCell = document.createElement('td');
                itemNameCell.textContent = offer.item_name;
                row.appendChild(itemNameCell);

                const quantityCell = document.createElement('td');
                quantityCell.textContent = offer.quantity;
                row.appendChild(quantityCell);

                const dateRegisteredCell = document.createElement('td');
                dateRegisteredCell.textContent = new Date(offer.date_registered).toLocaleString();
                row.appendChild(dateRegisteredCell);

                const statusCell = document.createElement('td');
                statusCell.textContent = offer.status;
                row.appendChild(statusCell);

                const withdrawalDateCell = document.createElement('td');
                withdrawalDateCell.textContent = offer.withdrawal_date ? new Date(offer.withdrawal_date).toLocaleString() : 'N/A';
                row.appendChild(withdrawalDateCell);

                offersTableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching offers:', error));

    // Function to open the offer modal
    function openOfferModal(itemId, itemName) {
        selectedItemId = itemId;
        offerItemName.textContent = `Offering: ${itemName}`;
        offerModal.style.display = 'block';
    }

    // Handle form submission
    offerForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const quantity = document.getElementById('quantity').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;

        // Validate that latitude and longitude contain only numbers (and optional decimals)
        const decimalPattern = /^[+-]?(\d*\.\d+|\d+\.?\d*)$/;
        if (!decimalPattern.test(latitude) || !decimalPattern.test(longitude)) {
            alert('Please enter valid numbers for latitude and longitude.');
            return;
        }

        fetch('/api/citizen_offers/offer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                itemId: selectedItemId,
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
                closeOfferModal(); // Call to close the modal after submission
            })
            .catch(error => console.error('Error submitting offer:', error));
    });
});
// Define the closeOfferModal function
function closeOfferModal() {
    offerModal.style.display = 'none';
    offerForm.reset();
}