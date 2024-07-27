const express = require('express');
const router = express.Router();
const { createUser, findUserByUsername } = require('../models/user');

router.post('/register', (req, res) => {
    const user = req.body;

    createUser(user, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ message: 'User created', userId: results.insertId });
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    findUserByUsername(username, (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ message: 'Login successful', user });
    });
});

module.exports = router;
