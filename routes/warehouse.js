const express = require('express');
const router = express.Router();
const connection = require('../db');

// Get all items in the warehouse
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM warehouse';
    connection.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching warehouse items' });
        }
        res.json(results);
    });
});

// Add or update item in the warehouse
router.post('/', (req, res) => {
    const { id, quantity } = req.body;
    const sql = 'INSERT INTO warehouse (item_id, quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = ?';
    connection.query(sql, [id, quantity, quantity], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error adding or updating warehouse item' });
        }
        res.json({ message: 'Item added or updated successfully' });
    });
});

// Update item quantity in the warehouse
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    const sql = 'UPDATE warehouse SET quantity = ? WHERE item_id = ?';
    connection.query(sql, [quantity, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error updating warehouse item quantity' });
        }
        res.json({ message: 'Item quantity updated successfully' });
    });
});

// Delete item from warehouse
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM warehouse WHERE item_id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error deleting warehouse item' });
        }
        res.json({ message: 'Item deleted successfully' });
    });
});

module.exports = router;
