const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Support encoded bodies

// Establish a database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'drcp'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Successfully connected to the database with ID ' + connection.threadId);
});

// Route for handling POST requests to '/signup'
app.post('/signup', (req, res) => {
    console.log('Received request body:', req.body); // Log request body for debugging

    const { email, pass, fname, lname, phone } = req.body;

    // Basic validation
    if (!email || !pass || !fname || !lname || !phone) {
        console.error('Validation error: Missing required fields');
        return res.status(400).json({ error: 'Validation error: Missing required fields' });
    }

    // Use a prepared statement to avoid SQL injection
    const sql = 'INSERT INTO users (email, password, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)';

    connection.query(sql, [email, pass, fname, lname, phone], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error registering new user', details: err.message });
            return;
        }
        console.log('User registered successfully');
        res.status(200).json({ message: 'User registered successfully' }); // Send JSON response
    });
});

// Route for handling POST requests to '/login'
app.post('/login', (req, res) => {
    console.log('Received login request:', req.body); // Log request body for debugging

    const { email, pass } = req.body;

    // Basic validation
    if (!email || !pass) {
        console.error('Validation error: Missing email or password');
        return res.status(400).json({ error: 'Validation error: Missing email or password' });
    }

    // Use a prepared statement to avoid SQL injection
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

    connection.query(sql, [email, pass], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error logging in', details: err.message });
            return;
        }
        if (results.length > 0) {
            console.log('User logged in successfully');
            res.status(200).json({ message: 'Login successful' }); // Send JSON response
        } else {
            console.error('Login failed: Invalid credentials');
            res.status(401).json({ error: 'Invalid email or password' }); // Send JSON response
        }
    });
});

app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
