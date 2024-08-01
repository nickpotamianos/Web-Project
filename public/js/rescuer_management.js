document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');

    const rescuerForm = document.getElementById('rescuerForm');
    const rescuerMessage = document.getElementById('rescuerMessage');
    const logoutButton = document.getElementById('logoutButton');

    if (!rescuerForm) {
        console.error('Rescuer form not found in the DOM');
        return;
    }

    console.log('Rescuer form found, attaching event listener');

    rescuerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submitted');

        const email = document.getElementById('rescuerEmail').value.trim();
        const password = document.getElementById('rescuerPassword').value.trim();
        const firstName = document.getElementById('rescuerFirstName').value.trim();
        const lastName = document.getElementById('rescuerLastName').value.trim();
        const phone = document.getElementById('rescuerPhone').value.trim();

        // Validation
        let errors = [];

        if (!email || !password || !firstName || !lastName || !phone) {
            errors.push("Please fill in all fields.");
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
            rescuerMessage.style.color = 'red';
            return;
        }

        console.log('Sending data:', { email, password, firstName, lastName, phone });

        fetch('/api/create-rescuer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, firstName, lastName, phone }),
        })
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                if (data.error) {
                    rescuerMessage.textContent = 'Error: ' + data.error;
                    rescuerMessage.style.color = 'red';
                } else {
                    rescuerMessage.textContent = 'Rescuer account created successfully!';
                    rescuerMessage.style.color = 'green';
                    rescuerForm.reset();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                rescuerMessage.textContent = 'An error occurred while creating the account.';
                rescuerMessage.style.color = 'red';
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