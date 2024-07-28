const express = require('express');
const router = express.Router();
const connection = require('../db');

// Get all categories
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM categories';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error fetching categories' });
            return;
        }
        res.status(200).json(results);
    });
});

// Add a new category
router.post('/', (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const sql = 'INSERT INTO categories (name) VALUES (?)';
    connection.query(sql, [name], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error adding category' });
            return;
        }
        res.status(201).json({ message: 'Category added successfully' });
    });
});

// Update a category
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const sql = 'UPDATE categories SET name = ? WHERE id = ?';
    connection.query(sql, [name, id], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error updating category' });
            return;
        }
        res.status(200).json({ message: 'Category updated successfully' });
    });
});

// Delete a category
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM categories WHERE id = ?';
    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error deleting category' });
            return;
        }
        res.status(200).json({ message: 'Category deleted successfully' });
    });
});

module.exports = router;
