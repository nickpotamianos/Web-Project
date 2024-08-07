document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('statsChart').getContext('2d');
    let chart;

    function createChart(data) {
        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Unassigned (NEW) Requests',
                        data: data.unassignedRequests,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)'
                    },
                    {
                        label: 'Completed Requests',
                        data: data.completedRequests,
                        backgroundColor: 'rgba(255, 205, 86, 0.5)'
                    },
                    {
                        label: 'Unassigned (NEW) Offers',
                        data: data.unassignedOffers,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)'
                    },
                    {
                        label: 'Completed Offers',
                        data: data.completedOffers,
                        backgroundColor: 'rgba(153, 102, 255, 0.5)'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function fetchData(startDate, endDate) {
        fetch(`/api/stats?startDate=${startDate}&endDate=${endDate}`)
            .then(response => response.json())
            .then(data => {
                console.log('Received data:', data);
                createChart(data);
            })
            .catch(error => console.error('Error fetching stats:', error));
    }

    document.getElementById('updateChart').addEventListener('click', function() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        fetchData(startDate, endDate);
    });

    // Initial chart creation with default date range (e.g., last 7 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('startDate').value = startDate;
    document.getElementById('endDate').value = endDate;
    fetchData(startDate, endDate);
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