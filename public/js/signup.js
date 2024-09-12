$(document).ready(function() {
    var current_fs, next_fs;
    var left, opacity, scale;
    var animating = false;
    var map, marker;
    var registerUrl = (window.location.hostname === "localhost") ?
        "http://localhost:3000/signup" :
        "http://web.potamianosgroup.com:3000/signup";

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

    function checkEmailExists(email) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "GET",
                url: registerUrl,
                data: { email: email },
                success: function(response) {
                    resolve(response.exists);
                },
                error: function(xhr, status, error) {
                    console.error('Error checking email:', error);
                    reject(error);
                }
            });
        });
    }

    // Form validation function
    function validateForm(fieldset) {
        var isValid = true;
        var errorMessage = "";

        fieldset.find('input[type="text"], input[type="password"]').each(function() {
            if ($(this).val().trim() === "") {
                isValid = false;
                errorMessage = "All fields are required.";
                return false;
            }
        });

        if (fieldset.find('input[name="email"]').length) {
            var email = fieldset.find('input[name="email"]').val();
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                isValid = false;
                errorMessage = "Please enter a valid email address.";
            }
        }

        if (fieldset.find('input[name="pass"]').length && fieldset.find('input[name="cpass"]').length) {
            var pass = fieldset.find('input[name="pass"]').val();
            var cpass = fieldset.find('input[name="cpass"]').val();
            if (pass !== cpass) {
                isValid = false;
                errorMessage = "Passwords do not match.";
            }
        }

        if (fieldset.find('input[name="address"]').length) {
            var address = fieldset.find('input[name="address"]').val();
            var latitude = fieldset.find('input[name="latitude"]').val();
            var longitude = fieldset.find('input[name="longitude"]').val();
            if (address.trim() === "" || !latitude || !longitude) {
                isValid = false;
                errorMessage = "Please enter a valid address.";
            }
        }

        fieldset.find('.error-message').text(errorMessage);
        return isValid;
    }

    $(".next").click(function() {
        if (animating) return false;
        current_fs = $(this).parent();

        if (!validateForm(current_fs)) return false;

        // If we're on the first step (email field), check if the email exists
        if (current_fs.find('input[name="email"]').length) {
            var email = current_fs.find('input[name="email"]').val();
            checkEmailExists(email).then(exists => {
                if (exists) {
                    current_fs.find('.error-message').text("An account with this email already exists.");
                } else {
                    proceedToNextStep();
                }
            }).catch(error => {
                console.error('Error checking email:', error);
                current_fs.find('.error-message').text("An error occurred. Please try again.");
            });
        } else {
            proceedToNextStep();
        }
    });

    function proceedToNextStep() {
        next_fs = current_fs.next();

        $("#progressbar li").eq($("fieldset").index(next_fs)).addClass("active");

        next_fs.show();
        current_fs.animate({ opacity: 0 }, {
            step: function(now, mx) {
                scale = 1 - (1 - now) * 0.2;
                left = (now * 50) + "%";
                opacity = 1 - now;
                current_fs.css({
                    'transform': 'scale(' + scale + ')',
                    'position': 'absolute'
                });
                next_fs.css({ 'left': left, 'opacity': opacity });
            },
            duration: 800,
            complete: function() {
                current_fs.hide();
                animating = false;
                if (next_fs.find('#map').length) {
                    setTimeout(initMap, 100);
                }
            },
            easing: 'easeInOutBack'
        });
    }

    $(".finish").click(function(e) {
        e.preventDefault();
        current_fs = $(this).parent();

        if (!validateForm(current_fs)) return false;

        var data = {
            email: $("input[name='email']").val(),
            pass: $("input[name='pass']").val(),
            fname: $("input[name='fname']").val(),
            lname: $("input[name='lname']").val(),
            phone: $("input[name='phone']").val(),
            address: $("input[name='address']").val(),
            latitude: $("input[name='latitude']").val(),
            longitude: $("input[name='longitude']").val()
        };

        checkEmailExists(data.email).then(exists => {
            if (exists) {
                current_fs.find('.error-message').text("An account with this email already exists.");
            } else {
                submitRegistration(data);
            }
        }).catch(error => {
            console.error('Error checking email:', error);
            current_fs.find('.error-message').text("An error occurred. Please try again.");
        });
    });
    function submitRegistration(data) {
        $.ajax({
            type: "POST",
            url: registerUrl,
            data: data,
            success: function(response) {
                console.log("Registration successful: ", response);
                window.location.href = 'citizen_dashboard.html';
            },
            error: function(xhr, status, error) {
                console.error('Registration failed: ' + error);
                alert('Failed to register: ' + xhr.responseText);
            }
        });
    }

    var geocoder = L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            countrycodes: 'gr',
            viewbox: '19.3736,34.8021,28.2336,41.7488',
            bounded: 1
        }
    });

    function formatAddress(result) {
        if (!result || !result.name) {
            return "Address not found";
        }

        var parts = result.name.split(',');
        var formattedAddress = parts[0].trim();

        if (parts.length > 1) {
            formattedAddress += ', ' + parts[1].trim();
        }

        if (result.address && result.address.postcode) {
            formattedAddress += ' ' + result.address.postcode;
        }

        return formattedAddress;
    }

    function initMap() {
        if (map) {
            map.remove();
        }

        map = L.map('map', {
            center: [38.246639, 21.734573],
            zoom: 13,
            zoomControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);

        L.control.zoom({
            position: 'topright'
        }).addTo(map);

        setTimeout(function() {
            map.invalidateSize(true);
        }, 100);

        map.on('click', function(e) {
            geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), function(results) {
                if (results.length > 0) {
                    var r = results[0];
                    updateMarker(e.latlng, r);
                }
            });
        });
    }

    function updateMarker(latlng, result) {
        if (marker) {
            marker.setLatLng(latlng);
        } else {
            marker = L.marker(latlng).addTo(map);
        }
        map.setView(latlng, 13);
        $('#latitude').val(latlng.lat);
        $('#longitude').val(latlng.lng);
        $('#address').val(formatAddress(result));
    }

    var suggestionsContainer = $('<div id="address-suggestions"></div>').insertAfter('#address');

    $('#address').on('input', function() {
        var query = $(this).val();
        if (query.length > 2) {
            geocoder.geocode(query, function(results) {
                suggestionsContainer.empty();
                results.forEach(function(result) {
                    $('<div>')
                        .text(formatAddress(result))
                        .click(function() {
                            updateMarker(result.center, result);
                            suggestionsContainer.hide();
                        })
                        .appendTo(suggestionsContainer);
                });
                suggestionsContainer.show();
            });
        } else {
            suggestionsContainer.hide();
        }
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('#address, #address-suggestions').length) {
            suggestionsContainer.hide();
        }
    });
});
