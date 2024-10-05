const express = require('express');
const router = express.Router();
const connection = require('../db'); // Adjust this path as necessary

// Middleware to check if the user is authenticated and is a citizen
function isAuthenticatedCitizen(req, res, next) {
    if (req.session.user && req.session.user.role === 'citizen') {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
}

// Route to get citizen profile
router.get('/profile', isAuthenticatedCitizen, (req, res) => {
    const userId = req.session.user.id;
    const sql = 'SELECT email, first_name, last_name, phone, address, latitude, longitude FROM users WHERE id = ?';

    connection.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user profile:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(results[0]);
    });
});

// Route to update citizen profile
router.post('/update-profile', isAuthenticatedCitizen, (req, res) => {
    const userId = req.session.user.id;
    const { email, firstName, lastName, phone, address, latitude, longitude, currentPassword, newPassword } = req.body;

    // First, verify the current password
    const checkPasswordSql = 'SELECT password FROM users WHERE id = ?';
    connection.query(checkPasswordSql, [userId], (err, results) => {
        if (err) {
            console.error('Error checking password:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length === 0 || results[0].password !== currentPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // If password is correct, proceed with update
        let updateSql = 'UPDATE users SET email = ?, first_name = ?, last_name = ?, phone = ?, address = ?, latitude = ?, longitude = ?';
        let params = [email, firstName, lastName, phone, address, latitude, longitude];

        if (newPassword) {
            updateSql += ', password = ?';
            params.push(newPassword);
        }

        updateSql += ' WHERE id = ?';
        params.push(userId);

        connection.query(updateSql, params, (err, result) => {
            if (err) {
                console.error('Error updating user profile:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'Profile updated successfully' });
        });
    });
});

module.exports = router;