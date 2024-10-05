const express = require('express');
const router = express.Router();
const connection = require('../db'); // Adjust the path to your actual db module

// Route to get all announcements with related items
router.get('/announcements', (req, res) => {
    const sql = `
        SELECT a.id, a.title, a.description, a.date_posted, i.id as item_id, i.name
        FROM announcements a
                 LEFT JOIN announcement_items ai ON a.id = ai.announcement_id
                 LEFT JOIN items i ON ai.item_id = i.id
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching announcements' });
        }

        const announcements = {};

        results.forEach(row => {
            if (!announcements[row.id]) {
                announcements[row.id] = {
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    date_posted: row.date_posted,
                    items: []
                };
            }

            if (row.item_id) {
                announcements[row.id].items.push({
                    id: row.item_id,
                    name: row.name
                });
            }
        });

        res.json(Object.values(announcements));
    });
});

// Route to get all offers for the logged-in user

router.get('/offers', (req, res) => {
    const userId = req.session.user.id; // Get the logged-in user's ID

    const sql = `
        SELECT o.id, i.name AS item_name, o.quantity, o.date_registered, o.status, o.withdrawal_date
        FROM offers o
                 JOIN items i ON o.item_id = i.id
        WHERE o.user_id = ?
    `;

    connection.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching offers' });
        }

        res.json(results);
    });
});

// Route to cancel an offer by ID
router.delete('/cancel_offer/:id', (req, res) => {
    const offerId = req.params.id;
    const userId = req.session.user.id; // Get the logged-in user's ID

    const sql = `
        DELETE FROM offers
        WHERE id = ? AND user_id = ? AND status = 'unassigned'
    `;

    connection.query(sql, [offerId, userId], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error cancelling offer' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Offer not found or cannot be cancelled' });
        }

        res.status(200).json({ message: 'Offer cancelled successfully' });
    });
});

// Route to submit an offer
router.post('/offer', (req, res) => {
    const { itemId, quantity, latitude, longitude } = req.body;
    const userId = req.session.user.id; // Get the logged-in user's ID

    const sql = `
        INSERT INTO offers (user_id, item_id, quantity, latitude, longitude, status)
        VALUES (?, ?, ?, ?, ?, 'unassigned')
    `;

    connection.query(sql, [userId, itemId, quantity, latitude, longitude], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error submitting offer' });
        }

        res.status(201).json({ message: 'Offer submitted successfully' });
    });
});

module.exports = router;