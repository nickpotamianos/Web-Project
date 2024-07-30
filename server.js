const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const fetch = require('node-fetch');
const fileUpload = require('express-fileupload');

const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items');
const categoryRoutes = require('./routes/categories');
const warehouseRoutes = require('./routes/warehouse');
const mapdataRoutes = require('./routes/mapdata');
const taskAssignmentRoutes = require('./routes/taskAssignment');
const warehouseStatusRoutes = require('./routes/warehouse_status');


const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Support encoded bodies
app.use(fileUpload());


// Database connection
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

// Session store
const sessionStore = new MySQLStore({}, connection);

// Configure session middleware
app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Middleware to check if the user is admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        res.status(403).send('Forbidden');
    }
}

// Use API routes
app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/mapdata', mapdataRoutes);
app.use('/api/bases', mapdataRoutes); // Ensure that /api/bases route is correctly used
app.use('/api/task-assignment', taskAssignmentRoutes);
app.use('/api/warehouse-status', warehouseStatusRoutes);


// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Serve public HTML files without restrictions
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.get('/warehouse_status.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'warehouse_status.html'));
});
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Serve protected HTML file for admin dashboard
app.get('/admin_dashboard', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin_dashboard.html'));
});

app.get('/admin_dashboard.html', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin_dashboard.html'));
});

// Serve protected HTML file for map view
app.get('/admin_dashboard/map.html', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'map.html'));
});

// Handle user login
app.post('/login', (req, res) => {
    const { email, pass } = req.body;

    // Basic validation
    if (!email || !pass) {
        return res.status(400).json({ error: 'Missing email or password' });
    }

    // Use a prepared statement to avoid SQL injection
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

    connection.query(sql, [email, pass], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error logging in' });
        }
        if (results.length > 0) {
            req.session.user = results[0];
            return res.status(200).json({ message: 'Login successful' });
        } else {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
    });
});

// Handle user logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error logging out' });
        }
        res.clearCookie('session_cookie_name');
        return res.status(200).json({ message: 'Logout successful' });
    });
});

// Fetch and populate database with JSON data
app.get('/api/populate', async (req, res) => {
    try {
        const response = await fetch('http://usidas.ceid.upatras.gr/web/2023/export.php');
        const data = await response.json();
        await populateDatabase(data);
        res.status(200).json({ message: 'Database populated successfully' });
    } catch (error) {
        console.error('Error populating database:', error);
        res.status(500).json({ error: 'Error populating database', details: error.message });
    }
});

// Route for handling JSON file uploads
app.post('/api/upload', (req, res) => {
    console.log('Upload route hit'); // Log when the route is accessed

    if (!req.files || !req.files.jsonFile) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const jsonFile = req.files.jsonFile;
    console.log('File received:', jsonFile.name); // Log the received file

    let data;
    try {
        data = JSON.parse(jsonFile.data);
        console.log('File parsed successfully:', data); // Log the parsed data
    } catch (e) {
        console.error('Invalid JSON file', e);
        return res.status(400).json({ error: 'Invalid JSON file' });
    }

    populateDatabase(data)
        .then(() => {
            console.log('Database populated successfully');
            res.status(200).json({ message: 'Database populated successfully from file' });
        })
        .catch(error => {
            console.error('Error populating database from file:', error);
            res.status(500).json({ error: 'Error populating database from file', details: error.message });
        });
});

// Function to populate the database
async function populateDatabase(data) {
    console.log('Populating database with data:', data);

    const categories = {};
    const items = data.items;

    if (!items || !Array.isArray(items)) {
        throw new Error('Invalid items data structure');
    }

    const categoryPromises = items.map(item => {
        if (!categories[item.category]) {
            categories[item.category] = `Category ${item.category}`;
            const categorySql = 'INSERT INTO categories (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)';
            return new Promise((resolve, reject) => {
                connection.query(categorySql, [item.category, `Category ${item.category}`], (err) => {
                    if (err) {
                        console.error('Error inserting category:', err);
                        reject(err);
                    } else {
                        console.log('Inserted/Updated category:', item.category);
                        resolve();
                    }
                });
            });
        }
        return Promise.resolve();
    });

    await Promise.all(categoryPromises);

    const itemPromises = items.map(item => {
        return new Promise((resolve, reject) => {
            const checkItemSql = 'SELECT quantity FROM items WHERE id = ?';
            connection.query(checkItemSql, [item.id], (err, results) => {
                if (err) {
                    console.error('Error checking item:', err);
                    return reject(err);
                }

                let newQuantity = 1;
                if (results.length > 0) {
                    newQuantity += results[0].quantity;
                }

                const itemSql = 'INSERT INTO items (id, name, category_id, quantity) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id), quantity=?';
                connection.query(itemSql, [item.id, item.name, item.category, newQuantity, newQuantity], (err) => {
                    if (err) {
                        console.error('Error inserting/updating item:', err);
                        reject(err);
                    } else {
                        console.log('Inserted/Updated item:', item.id);

                        const detailPromises = (item.details || []).map(detail => {
                            return new Promise((resolveDetail, rejectDetail) => {
                                const detailSql = 'INSERT INTO item_details (item_id, detail_name, detail_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE detail_value=VALUES(detail_value)';
                                connection.query(detailSql, [item.id, detail.detail_name, detail.detail_value], (err) => {
                                    if (err) {
                                        console.error('Error inserting item detail:', err);
                                        rejectDetail(err);
                                    } else {
                                        console.log('Inserted/Updated item detail for item:', item.id);
                                        resolveDetail();
                                    }
                                });
                            });
                        });
                        Promise.all(detailPromises)
                            .then(() => resolve())
                            .catch(err => reject(err));
                    }
                });
            });
        });
    });

    await Promise.all(itemPromises);
}

// Route for handling POST requests to '/signup'
app.post('/signup', (req, res) => {
    console.log('Received request body:', req.body); // Log request body for debugging

    const { email, pass, fname, lname, phone } = req.body;
    const role = 'citizen'; // Default role

    // Basic validation
    if (!email || !pass || !fname || !lname || !phone) {
        console.error('Validation error: Missing required fields');
        return res.status(400).json({ error: 'Validation error: Missing required fields' });
    }

    // Use a prepared statement to avoid SQL injection
    const sql = 'INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)';

    connection.query(sql, [email, pass, fname, lname, phone, role], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error registering new user', details: err.message });
            return;
        }
        console.log('User registered successfully');
        res.status(200).json({ message: 'User registered successfully' }); // Send JSON response
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
