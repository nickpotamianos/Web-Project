const express = require('express');
const router = express.Router();
const connection = require('../db');

router.get('/', (req, res) => {
    const { startDate, endDate } = req.query;

    const sql = `
        SELECT
            date,
            SUM(unassigned_requests) as unassigned_requests,
            SUM(completed_requests) as completed_requests,
            SUM(unassigned_offers) as unassigned_offers,
            SUM(completed_offers) as completed_offers
        FROM (
            SELECT
            DATE(date_registered) as date,
            COUNT(CASE WHEN status = 'unassigned' THEN 1 END) as unassigned_requests,
            COUNT(CASE WHEN status = 'processed' THEN 1 END) as completed_requests,
            0 as unassigned_offers,
            0 as completed_offers
            FROM requests
            WHERE date_registered BETWEEN ? AND ?
            GROUP BY DATE(date_registered)

            UNION ALL

            SELECT
            DATE(date_registered) as date,
            0 as unassigned_requests,
            0 as completed_requests,
            COUNT(CASE WHEN status = 'unassigned' THEN 1 END) as unassigned_offers,
            COUNT(CASE WHEN status = 'processed' THEN 1 END) as completed_offers
            FROM offers
            WHERE date_registered BETWEEN ? AND ?
            GROUP BY DATE(date_registered)
            ) as combined
        GROUP BY date
        ORDER BY date
    `;

    connection.query(sql, [startDate, endDate, startDate, endDate], (err, results) => {
        if (err) {
            console.error('Error fetching statistics:', err);
            return res.status(500).json({ error: 'Error fetching statistics' });
        }

        const stats = {
            labels: [],
            unassignedRequests: [],
            completedRequests: [],
            unassignedOffers: [],
            completedOffers: []
        };

        results.forEach(row => {
            const formattedDate = new Date(row.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            stats.labels.push(formattedDate);
            stats.unassignedRequests.push(row.unassigned_requests);
            stats.completedRequests.push(row.completed_requests);
            stats.unassignedOffers.push(row.unassigned_offers);
            stats.completedOffers.push(row.completed_offers);
        });

        res.json(stats);
    });
});

module.exports = router;