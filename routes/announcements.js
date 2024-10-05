const express = require('express');
const router = express.Router();
const connection = require('../db');

// Get all announcements
router.get('/', (req, res) => {
    const sql = `
        SELECT a.*, GROUP_CONCAT(ai.item_id) as item_ids
        FROM announcements a
        LEFT JOIN announcement_items ai ON a.id = ai.announcement_id
        GROUP BY a.id
        ORDER BY a.date_posted DESC
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching announcements' });
        }
        res.status(200).json(results);
    });
});

// Create a new announcement
router.post('/', (req, res) => {
    const { title, description, itemIds } = req.body;

    if (!title || !description || !itemIds || !Array.isArray(itemIds)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    connection.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Error creating announcement' });
        }

        const announcementSql = 'INSERT INTO announcements (title, description) VALUES (?, ?)';
        connection.query(announcementSql, [title, description], (err, result) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error inserting announcement:', err);
                    res.status(500).json({ error: 'Error creating announcement' });
                });
            }

            const announcementId = result.insertId;
            const itemsSql = 'INSERT INTO announcement_items (announcement_id, item_id) VALUES ?';
            const itemValues = itemIds.map(itemId => [announcementId, itemId]);

            connection.query(itemsSql, [itemValues], (err) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error('Error inserting announcement items:', err);
                        res.status(500).json({ error: 'Error creating announcement' });
                    });
                }

                connection.commit(err => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).json({ error: 'Error creating announcement' });
                        });
                    }
                    res.status(201).json({ message: 'Announcement created successfully', id: announcementId });
                });
            });
        });
    });
});

module.exports = router;