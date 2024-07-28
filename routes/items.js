const express = require('express');
const router = express.Router();
const connection = require('../db');

// Get all items with details
router.get('/', (req, res) => {
    const itemsSql = 'SELECT * FROM items';
    const detailsSql = 'SELECT * FROM item_details WHERE item_id IN (?)';

    connection.query(itemsSql, (err, items) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching items' });
        }

        const itemIds = items.map(item => item.id);
        if (itemIds.length === 0) {
            return res.json(items); // No items found, return empty array
        }

        connection.query(detailsSql, [itemIds], (err, details) => {
            if (err) {
                console.error('Error fetching item details:', err);
                return res.status(500).json({ error: 'Error fetching item details' });
            }

            // Filter out invalid details
            const validDetails = details.filter(detail => detail.detail_name || detail.detail_value);

            const detailsByItemId = validDetails.reduce((acc, detail) => {
                if (!acc[detail.item_id]) {
                    acc[detail.item_id] = [];
                }
                acc[detail.item_id].push(detail);
                return acc;
            }, {});

            const itemsWithDetails = items.map(item => ({
                ...item,
                details: detailsByItemId[item.id] || []
            }));

            res.status(200).json(itemsWithDetails);
        });
    });
});

// Add a new item
router.post('/', (req, res) => {
    const { name, category_id, quantity } = req.body;
    if (!name || !category_id || quantity === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const sql = 'INSERT INTO items (name, category_id, quantity) VALUES (?, ?, ?)';
    connection.query(sql, [name, category_id, quantity], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error adding item' });
        }
        res.status(201).json({ message: 'Item added successfully' });
    });
});

// Update an item
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, category_id, quantity } = req.body;
    if (!name || !category_id || quantity === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const sql = 'UPDATE items SET name = ?, category_id = ?, quantity = ? WHERE id = ?';
    connection.query(sql, [name, category_id, quantity, id], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error updating item' });
        }
        res.status(200).json({ message: 'Item updated successfully' });
    });
});

// Delete an item
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM items WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error deleting item' });
        }
        res.status(200).json({ message: 'Item deleted successfully' });
    });
});

module.exports = router;
