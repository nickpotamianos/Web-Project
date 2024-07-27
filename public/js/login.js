$(document).ready(function() {
    $(".next").click(function(e) {
        e.preventDefault(); // Prevent the default form submission
        console.log("Login button clicked"); // Debug log

        // Collect the form data
        var data = {
            email: $("input[name='email']").val(),
            pass: $("input[name='pass']").val()
        };

        // Log the data being sent for debugging
        console.log("Data being sent: ", data);

        // Send the form data using AJAX
        $.ajax({
            type: "POST",
            url: "http://localhost:3000/login", // Ensure this matches your server route and port
            data: data,
            success: function(response) {
                console.log("Login successful: ", response); // Debug log
                // Redirect to the dashboard or another page on success
                window.location.href = 'citizen_dashboard.html';
            },
            error: function(xhr, status, error) {
                console.error('Login failed: ' + error);
                console.error('Status: ' + status);
                console.error('Response: ' + xhr.responseText);
                alert('Failed to login: ' + xhr.responseText);
            }
        });
    });
});
