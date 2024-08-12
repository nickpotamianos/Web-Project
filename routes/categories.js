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

    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        // Get all items in the category
        const getItemsSql = 'SELECT id FROM items WHERE category_id = ?';
        connection.query(getItemsSql, [id], (err, items) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error fetching items in category:', err);
                    res.status(500).json({ error: 'Error fetching items in category' });
                });
            }

            const itemIds = items.map(item => item.id);

            // If there are no items, skip deleting from related tables
            if (itemIds.length === 0) {
                // Delete the category directly
                const deleteCategorySql = 'DELETE FROM categories WHERE id = ?';
                connection.query(deleteCategorySql, [id], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error deleting category:', err);
                            res.status(500).json({ error: 'Error deleting category' });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('Error committing transaction:', err);
                                res.status(500).json({ error: 'Error committing transaction' });
                            });
                        }
                        res.status(200).json({ message: 'Category deleted successfully' });
                    });
                });
            } else {
                // Continue with existing logic for deleting related data
                const deleteAnnouncementItemsSql = 'DELETE FROM announcement_items WHERE item_id IN (?)';
                connection.query(deleteAnnouncementItemsSql, [itemIds], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error deleting related announcement items:', err);
                            res.status(500).json({ error: 'Error deleting related announcement items' });
                        });
                    }

                    // Delete related offers
                    const deleteOffersSql = 'DELETE FROM offers WHERE item_id IN (?)';
                    connection.query(deleteOffersSql, [itemIds], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('Error deleting related offers:', err);
                                res.status(500).json({ error: 'Error deleting related offers' });
                            });
                        }

                        // Delete related requests
                        const deleteRequestsSql = 'DELETE FROM requests WHERE item_id IN (?)';
                        connection.query(deleteRequestsSql, [itemIds], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    console.error('Error deleting related requests:', err);
                                    res.status(500).json({ error: 'Error deleting related requests' });
                                });
                            }

                            // Delete item details
                            const deleteDetailsSql = 'DELETE FROM item_details WHERE item_id IN (?)';
                            connection.query(deleteDetailsSql, [itemIds], (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error('Error deleting item details:', err);
                                        res.status(500).json({ error: 'Error deleting item details' });
                                    });
                                }

                                // Delete items
                                const deleteItemsSql = 'DELETE FROM items WHERE category_id = ?';
                                connection.query(deleteItemsSql, [id], (err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            console.error('Error deleting items:', err);
                                            res.status(500).json({ error: 'Error deleting items' });
                                        });
                                    }

                                    // Finally, delete the category
                                    const deleteCategorySql = 'DELETE FROM categories WHERE id = ?';
                                    connection.query(deleteCategorySql, [id], (err) => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                console.error('Error deleting category:', err);
                                                res.status(500).json({ error: 'Error deleting category' });
                                            });
                                        }

                                        connection.commit((err) => {
                                            if (err) {
                                                return connection.rollback(() => {
                                                    console.error('Error committing transaction:', err);
                                                    res.status(500).json({ error: 'Error committing transaction' });
                                                });
                                            }
                                            res.status(200).json({ message: 'Category and related items deleted successfully' });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            }
        });
    });
});

module.exports = router;