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
                        label: 'New Requests',
                        data: data.newRequests,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)'
                    },
                    {
                        label: 'New Offers',
                        data: data.newOffers,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                    },
                    {
                        label: 'Processed Requests',
                        data: data.processedRequests,
                        backgroundColor: 'rgba(255, 206, 86, 0.5)'
                    },
                    {
                        label: 'Processed Offers',
                        data: data.processedOffers,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)'
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
                console.log('Received data:', data); // Add this line for debugging
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
});