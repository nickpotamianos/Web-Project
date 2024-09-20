const express = require('express');
const router = express.Router();
const connection = require('../db');

// Fetch categories
router.get('/categories', (req, res) => {
    const sql = 'SELECT id, name FROM categories';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching categories' });
        }
        res.status(200).json(results);
    });
});

// Fetch items by category or search query
router.get('/items', (req, res) => {
    const { category, search } = req.query;

    let sql;
    let params = [];

    if (category) {
        sql = 'SELECT id, name FROM items WHERE category_id = ?';
        params.push(category);
    } else if (search) {
        sql = 'SELECT id, name FROM items WHERE name LIKE ?';
        params.push(`%${search}%`);
    } else {
        return res.status(400).json({ error: 'Category ID or search query is required' });
    }

    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Error fetching items' });
        }
        res.status(200).json(results);
    });
});

// Handle POST requests for RequestTask only
router.post('/RequestTask', (req, res) => {
    const { itemId, quantity, latitude, longitude } = req.body;
    const userId = req.session.user.id; // Get the logged-in user's ID

    console.log(`Executing RequestTask with params:`, { itemId, quantity, latitude, longitude, userId });

    const sql = `CALL RequestTask(?, ?, ?, ?, ?)`;
    const params = [itemId, quantity, latitude, longitude, userId];

    connection.query(sql, params, (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: `Error executing RequestTask` });
        }
        res.status(201).json({ message: `Request created successfully` });
    });
});

// Fetch user's tasks (only requests)
router.get('/citizen_tasks', (req, res) => {
    const userId = req.session.user.id;

    const requestsQuery = `
        SELECT r.id, i.name AS item_name, r.quantity, r.date_registered, r.date_collected, r.status
        FROM requests r
                 JOIN items i ON r.item_id = i.id
        WHERE r.user_id = ?
    `;

    connection.query(requestsQuery, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Error fetching tasks' });
        }
        res.status(200).json(results);
    });
});

module.exports = router;
