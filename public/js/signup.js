$(document).ready(function() {
    var current_fs, next_fs, previous_fs; // Fieldsets
    var left, opacity, scale; // Fieldset properties which we will animate
    var animating; // Flag to prevent quick multi-click glitches

    $(".next").click(function(){
        console.log("Next button clicked"); // Debug log
        if (animating) return false;
        animating = true;

        current_fs = $(this).parent();
        next_fs = $(this).parent().next();

        // Activate next step on progressbar using the index of next_fs
        $("#progressbar li").eq($("fieldset").index(next_fs)).addClass("active");

        // Show the next fieldset
        next_fs.show();
        // Hide the current fieldset with style
        current_fs.animate({ opacity: 0 }, {
            step: function(now, mx) {
                // As the opacity of current_fs reduces to 0 - stored in "now"
                // 1. Scale current_fs down to 80%
                scale = 1 - (1 - now) * 0.2;
                // 2. Bring next_fs from the right(50%)
                left = (now * 50) + "%";
                // 3. Increase opacity of next_fs to 1 as it moves in
                opacity = 1 - now;
                current_fs.css({
                    'transform': 'scale('+scale+')',
                    'position': 'absolute'
                });
                next_fs.css({ 'left': left, 'opacity': opacity });
            },
            duration: 800,
            complete: function() {
                current_fs.hide();
                animating = false;
            },
            easing: 'easeInOutBack' // This comes from the custom easing plugin
        });
    });

    $(".previous").click(function(){
        console.log("Previous button clicked"); // Debug log
        if (animating) return false;
        animating = true;

        current_fs = $(this).parent();
        previous_fs = $(this).parent().prev();

        // De-activate current step on progressbar
        $("#progressbar li").eq($("fieldset").index(current_fs)).removeClass("active");

        // Show the previous fieldset
        previous_fs.show();
        // Hide the current fieldset with style
        current_fs.animate({ opacity: 0 }, {
            step: function(now, mx) {
                // As the opacity of current_fs reduces to 0 - stored in "now"
                // 1. Scale previous_fs from 80% to 100%
                scale = 0.8 + (1 - now) * 0.2;
                // 2. Take current_fs to the right(50%) - from 0%
                left = ((1 - now) * 50) + "%";
                // 3. Increase opacity of previous_fs to 1 as it moves in
                opacity = 1 - now;
                current_fs.css({ 'left': left });
                previous_fs.css({ 'transform': 'scale('+scale+')', 'opacity': opacity });
            },
            duration: 800,
            complete: function() {
                current_fs.hide();
                animating = false;
            },
            easing: 'easeInOutBack'
        });
    });

    $(".finish").click(function(e) {
        e.preventDefault(); // Prevent the default form submission
        console.log("Finish button clicked"); // Debug log

        // Collect all the form data
        var data = {
            email: $("input[name='email']").val(),
            pass: $("input[name='pass']").val(),
            fname: $("input[name='fname']").val(),
            lname: $("input[name='lname']").val(),
            phone: $("input[name='phone']").val()
        };

        // Log the data being sent for debugging
        console.log("Data being sent: ", data);

        // Send the form data using AJAX
        $.ajax({
            type: "POST",
            url: "http://localhost:3000/signup", // Ensure this matches your server route and port
            data: data,
            success: function(response) {
                console.log("Registration successful: ", response); // Debug log
                // Redirect to another page on success
                window.location.href = 'citizen_dashboard.html';
            },
            error: function(xhr, status, error) {
                console.error('Registration failed: ' + error);
                console.error('Status: ' + status);
                console.error('Response: ' + xhr.responseText);
                alert('Failed to register: ' + xhr.responseText);
            }
        });
    });

});
