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
        res.status(201).json({ message: 'Category added successfully', categoryId: results.insertId });
    });
});

// Update a category
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
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

// Delete a category along with its items and item details
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    const deleteItemDetailsSql = 'DELETE FROM item_details WHERE item_id IN (SELECT id FROM items WHERE category_id = ?)';
    const deleteItemsSql = 'DELETE FROM items WHERE category_id = ?';
    const deleteCategorySql = 'DELETE FROM categories WHERE id = ?';

    connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
            console.error('Transaction error: ', transactionErr);
            res.status(500).json({ error: 'Error starting transaction' });
            return;
        }

        connection.query(deleteItemDetailsSql, [id], (err, results) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Database error: ', err);
                    res.status(500).json({ error: 'Error deleting item details' });
                });
            }

            connection.query(deleteItemsSql, [id], (err, results) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error('Database error: ', err);
                        res.status(500).json({ error: 'Error deleting items' });
                    });
                }

                connection.query(deleteCategorySql, [id], (err, results) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Database error: ', err);
                            res.status(500).json({ error: 'Error deleting category' });
                        });
                    }

                    connection.commit((commitErr) => {
                        if (commitErr) {
                            return connection.rollback(() => {
                                console.error('Commit error: ', commitErr);
                                res.status(500).json({ error: 'Error committing transaction' });
                            });
                        }

                        res.status(200).json({ message: 'Category deleted successfully' });
                    });
                });
            });
        });
    });
});

module.exports = router;
