const express = require('express');
const router = express.Router();
const connection = require('../db');

router.get('/', (req, res) => {
    const categoriesQuery = 'SELECT * FROM categories';
    const itemsQuery = `
        SELECT i.id, i.name, i.category_id, c.name AS category_name,
               SUM(CASE WHEN w.location = 'base' THEN w.quantity ELSE 0 END) AS quantity_in_base,
               SUM(CASE WHEN w.location = 'vehicle' THEN w.quantity ELSE 0 END) AS quantity_in_vehicles
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN warehouse w ON i.id = w.item_id
        GROUP BY i.id, i.name, i.category_id, c.name
    `;

    connection.query(categoriesQuery, (err, categories) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ error: 'Error fetching warehouse data' });
        }

        connection.query(itemsQuery, (err, items) => {
            if (err) {
                console.error('Error fetching items:', err);
                return res.status(500).json({ error: 'Error fetching warehouse data' });
            }

            res.json({ categories, items });
        });
    });
});

module.exports = router;