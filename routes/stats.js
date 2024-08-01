const express = require('express');
const router = express.Router();
const connection = require('../db');

router.get('/', (req, res) => {
    const { startDate, endDate } = req.query;

    const sql = `
        SELECT
            date,
            SUM(new_requests) as new_requests,
            SUM(processed_requests) as processed_requests,
            SUM(new_offers) as new_offers,
            SUM(processed_offers) as processed_offers
        FROM (
            SELECT
            DATE(date_registered) as date,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as new_requests,
            COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_requests,
            0 as new_offers,
            0 as processed_offers
            FROM requests
            WHERE date_registered BETWEEN ? AND ?
            GROUP BY DATE(date_registered)

            UNION ALL

            SELECT
            DATE(date_registered) as date,
            0 as new_requests,
            0 as processed_requests,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as new_offers,
            COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_offers
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
            newRequests: [],
            processedRequests: [],
            newOffers: [],
            processedOffers: []
        };

        results.forEach(row => {
            const formattedDate = new Date(row.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            stats.labels.push(formattedDate);
            stats.newRequests.push(row.new_requests);
            stats.processedRequests.push(row.processed_requests);
            stats.newOffers.push(row.new_offers);
            stats.processedOffers.push(row.processed_offers);
        });

        res.json(stats);
    });
});

module.exports = router;