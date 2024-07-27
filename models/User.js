const connection = require('../db');

const createUser = (user, callback) => {
    const query = 'INSERT INTO users (username, password, role, name, phone, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [user.username, user.password, user.role, user.name, user.phone, user.location.lat, user.location.lng];

    connection.query(query, values, (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
};

const findUserByUsername = (username, callback) => {
    const query = 'SELECT * FROM users WHERE username = ?';

    connection.query(query, [username], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0]);
    });
};

module.exports = {
    createUser,
    findUserByUsername
};
