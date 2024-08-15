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
            data: JSON.stringify(data),
            contentType: "application/json",
            success: function(response) {
                console.log("Login successful: ", response); // Debug log
                // Redirect based on user role
                switch(response.role) {
                    case 'admin':
                        window.location.href = 'admin_dashboard.html';
                        break;
                    case 'rescuer':
                        window.location.href = 'rescuer_dashboard.html';
                        break;
                    case 'citizen':
                        window.location.href = 'citizen_dashboard.html';
                        break;
                    default:
                        console.error('Unknown user role:', response.role);
                        alert('Login successful but unknown user role');
                }
            },
            error: function(xhr, status, error) {
                console.error('Login failed: ' + error);
                console.error('Status: ' + status);
                console.error('Response: ' + xhr.responseText);
                alert('Failed to login: ' + xhr.responseText);
            }
        });
    });
    // Password visibility toggle
    $(".password-toggle").click(function() {
        var input = $(this).prev('input');
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            $(this).removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            input.attr('type', 'password');
            $(this).removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });
});