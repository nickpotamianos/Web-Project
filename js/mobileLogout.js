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