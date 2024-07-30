const express = require('express');
const router = express.Router();
const connection = require('../db');

router.get('/', (req, res) => {
    console.log('Warehouse status route accessed');
    const query = `
        SELECT
            i.id AS item_id,
            i.name AS item_name,
            c.id AS category_id,
            c.name AS category_name,
            i.quantity AS quantity_in_base,
            COALESCE(SUM(JSON_EXTRACT(v.inventory, CONCAT('$."', i.id, '"'))), 0) AS quantity_in_vehicles
        FROM
            items i
                LEFT JOIN
            categories c ON i.category_id = c.id
                LEFT JOIN
            vehicles v ON JSON_CONTAINS_PATH(v.inventory, 'one', CONCAT('$."', i.id, '"')) = 1
        GROUP BY
            i.id, i.name, c.id, c.name, i.quantity
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: 'Error fetching warehouse data', details: err.message });
        }

        console.log('Query results:', results);

        const categories = [];
        const items = [];

        results.forEach(row => {
            if (row.category_id && !categories.some(c => c.id === row.category_id)) {
                categories.push({ id: row.category_id, name: row.category_name });
            }

            items.push({
                id: row.item_id,
                name: row.item_name,
                category_id: row.category_id,
                category_name: row.category_name,
                quantity_in_base: row.quantity_in_base,
                quantity_in_vehicles: parseInt(row.quantity_in_vehicles),
                total_quantity: row.quantity_in_base + parseInt(row.quantity_in_vehicles)
            });
        });

        console.log('Processed data:', { categories, items });
        res.json({ categories, items });
    });
});

module.exports = router;