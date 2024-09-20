$(document).ready(function() {
    var map, marker;
    var geocoder = L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            countrycodes: 'gr',
            viewbox: '19.3736,34.8021,28.2336,41.7488',
            bounded: 1
        }
    });

    function fetchUserData() {
        $.ajax({
            url: '/api/citizen/profile',
            method: 'GET',
            success: function(data) {
                $('#email').val(data.email);
                $('#firstName').val(data.first_name);
                $('#lastName').val(data.last_name);
                $('#phone').val(data.phone);
                $('#address').val(data.address);
                $('#latitude').val(data.latitude);
                $('#longitude').val(data.longitude);
                initMap(data.latitude, data.longitude);
            },
            error: function(xhr, status, error) {
                console.error('Error fetching user data:', error);
                $('#profileMessage').text('Error loading profile data. Please try again.').addClass('error-message');
            }
        });
    }

    function initMap(lat, lng) {
        map = L.map('map').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);
        marker = L.marker([lat, lng], {draggable: true}).addTo(map);

        marker.on('dragend', function(event) {
            var position = marker.getLatLng();
            updateMarkerPosition(position);
            reverseGeocode(position);
        });

        map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            updateMarkerPosition(e.latlng);
            reverseGeocode(e.latlng);
        });
    }

    function updateMarkerPosition(latlng) {
        $('#latitude').val(latlng.lat.toFixed(6));
        $('#longitude').val(latlng.lng.toFixed(6));
    }

    function reverseGeocode(latlng) {
        geocoder.reverse(latlng, map.options.crs.scale(map.getZoom()), function(results) {
            if (results.length > 0) {
                $('#address').val(formatAddress(results[0]));
            }
        });
    }

    function formatAddress(result) {
        if (!result || !result.name) return "Address not found";
        var parts = result.name.split(',');
        var formattedAddress = parts[0].trim();
        if (parts.length > 1) formattedAddress += ', ' + parts[1].trim();
        if (result.address && result.address.postcode) {
            formattedAddress += ' ' + result.address.postcode;
        }
        return formattedAddress;
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
                            var latlng = result.center;
                            marker.setLatLng(latlng);
                            map.setView(latlng, 13);
                            updateMarkerPosition(latlng);
                            $('#address').val(formatAddress(result));
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

    $('#editProfileForm').submit(function(e) {
        e.preventDefault();
        var formData = {
            email: $('#email').val(),
            firstName: $('#firstName').val(),
            lastName: $('#lastName').val(),
            phone: $('#phone').val(),
            address: $('#address').val(),
            latitude: $('#latitude').val(),
            longitude: $('#longitude').val(),
            currentPassword: $('#currentPassword').val(),
            newPassword: $('#newPassword').val(),
            confirmPassword: $('#confirmPassword').val()
        };

        if (formData.newPassword !== formData.confirmPassword) {
            $('#profileMessage').text('New passwords do not match.').addClass('error-message');
            return;
        }

        $.ajax({
            url: '/api/citizen/update-profile',
            method: 'POST',
            data: JSON.stringify(formData),
            contentType: 'application/json',
            success: function(response) {
                $('#profileMessage').text('Profile updated successfully!').removeClass('error-message');
                if (formData.newPassword) {
                    $('#currentPassword, #newPassword, #confirmPassword').val('');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error updating profile:', error);
                $('#profileMessage').text('Error updating profile. Please try again.').addClass('error-message');
            }
        });
    });

    $('.password-toggle').click(function() {
        var input = $(this).prev('input');
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            $(this).removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            input.attr('type', 'password');
            $(this).removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });

    $('#logoutButton').click(function() {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            success: function() {
                window.location.href = '/login.html';
            },
            error: function(xhr, status, error) {
                console.error('Logout failed:', error);
                alert('Logout failed. Please try again.');
            }
        });
    });

    fetchUserData();
});