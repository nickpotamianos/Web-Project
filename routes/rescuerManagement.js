const express = require('express');
const router = express.Router();
const connection = require('../db'); // Adjust this path as needed

// Middleware to check if the user is admin (assuming this is defined elsewhere)
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        res.status(403).send('Forbidden');
    }
};

// Fetch all rescuer accounts
router.get('/', isAdmin, (req, res) => {
    const sql = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               v.id AS vehicle_id, v.name AS vehicle_name
        FROM users u
                 LEFT JOIN (
            SELECT user_id, MAX(id) as latest_vehicle_id
            FROM vehicles
            WHERE user_id IS NOT NULL
            GROUP BY user_id
        ) latest_v ON u.id = latest_v.user_id
                 LEFT JOIN vehicles v ON latest_v.latest_vehicle_id = v.id
        WHERE u.role = 'rescuer'
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching rescuer accounts:', err);
            return res.status(500).json({ error: 'Error fetching rescuer accounts' });
        }
        res.status(200).json(results);
    });
});

// Fetch a single rescuer's details
router.get('/:id', isAdmin, (req, res) => {
    const rescuerId = req.params.id;
    const sql = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               v.id AS vehicle_id, v.name AS vehicle_name
        FROM users u
                 LEFT JOIN vehicles v ON u.id = v.user_id
        WHERE u.id = ? AND u.role = 'rescuer'
    `;
    connection.query(sql, [rescuerId], (err, results) => {
        if (err) {
            console.error('Error fetching rescuer details:', err);
            return res.status(500).json({ error: 'Error fetching rescuer details' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Rescuer not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Update a rescuer's details
router.put('/:id', isAdmin, (req, res) => {
    const rescuerId = req.params.id;
    const { email, firstName, lastName, phone, vehicleAssignment } = req.body;

    console.log('Received data:', { email, firstName, lastName, phone, vehicleAssignment }); // Add this line for debugging

    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Error updating rescuer account' });
        }

        const updateUserSql = 'UPDATE users SET email = ?, first_name = ?, last_name = ?, phone = ? WHERE id = ? AND role = "rescuer"';
        connection.query(updateUserSql, [email, firstName, lastName, phone, rescuerId], (err, result) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error updating rescuer details:', err);
                    res.status(500).json({ error: 'Error updating rescuer details' });
                });
            }

            if (vehicleAssignment === 'new') {
                createNewVehicle(rescuerId, firstName, res);
            } else if (vehicleAssignment) {
                assignVehicle(rescuerId, vehicleAssignment, res);
            } else {
                unassignVehicle(rescuerId, res);
            }
        });
    });
});
router.delete('/:id', (req, res) => {
    const rescuerId = req.params.id;

    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Error deleting rescuer account' });
        }

        // First, unassign any vehicle associated with this rescuer
        const unassignVehicleSql = 'UPDATE vehicles SET user_id = NULL WHERE user_id = ?';
        connection.query(unassignVehicleSql, [rescuerId], (err) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error unassigning vehicle:', err);
                    res.status(500).json({ error: 'Error unassigning vehicle' });
                });
            }

            // Then, delete the rescuer account
            const deleteRescuerSql = 'DELETE FROM users WHERE id = ? AND role = "rescuer"';
            connection.query(deleteRescuerSql, [rescuerId], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error('Error deleting rescuer:', err);
                        res.status(500).json({ error: 'Error deleting rescuer account' });
                    });
                }

                if (result.affectedRows === 0) {
                    return connection.rollback(() => {
                        res.status(404).json({ error: 'Rescuer not found' });
                    });
                }

                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).json({ error: 'Error deleting rescuer account' });
                        });
                    }
                    res.status(200).json({ message: 'Rescuer account deleted successfully' });
                });
            });
        });
    });
});
function unassignVehicle(rescuerId, res) {
    console.log('Unassigning vehicle for rescuer:', rescuerId); // Add this line for debugging
    const unassignVehicleSql = 'UPDATE vehicles SET user_id = NULL WHERE user_id = ?';
    connection.query(unassignVehicleSql, [rescuerId], (err) => {
        if (err) {
            return connection.rollback(() => {
                console.error('Error unassigning vehicle:', err);
                res.status(500).json({ error: 'Error unassigning vehicle' });
            });
        }
        commitTransaction(res);
    });
}

function createNewVehicle(userId, firstName, res) {
    const baseSql = 'SELECT latitude, longitude FROM bases LIMIT 1';
    connection.query(baseSql, (err, baseResults) => {
        if (err) {
            return connection.rollback(() => {
                console.error('Error fetching base coordinates:', err);
                res.status(500).json({ error: 'Error creating new vehicle' });
            });
        }

        const { latitude, longitude } = baseResults[0];
        const vehicleSql = 'INSERT INTO vehicles (name, status, latitude, longitude) VALUES (?, ?, ?, ?)';
        const vehicleName = `${firstName}'s Vehicle`;
        connection.query(vehicleSql, [vehicleName, 'active', latitude, longitude], (err, result) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error creating new vehicle:', err);
                    res.status(500).json({ error: 'Error creating new vehicle' });
                });
            }
            assignVehicle(userId, result.insertId, res);
        });
    });
}
// Add this new route to fetch all vehicles
router.get('/vehicles/all', isAdmin, (req, res) => {
    const sql = 'SELECT id, name, user_id FROM vehicles';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching vehicles:', err);
            return res.status(500).json({ error: 'Error fetching vehicles' });
        }
        res.status(200).json(results);
    });
});
function assignVehicle(userId, vehicleId, res) {
    // First, unassign any previously assigned vehicle
    const unassignPreviousVehicleSql = 'UPDATE vehicles SET user_id = NULL WHERE user_id = ?';
    connection.query(unassignPreviousVehicleSql, [userId], (err) => {
        if (err) {
            return connection.rollback(() => {
                console.error('Error unassigning previous vehicle:', err);
                res.status(500).json({ error: 'Error unassigning previous vehicle' });
            });
        }

        // Now assign the new vehicle
        const assignNewVehicleSql = 'UPDATE vehicles SET user_id = ? WHERE id = ?';
        connection.query(assignNewVehicleSql, [userId, vehicleId], (err) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error assigning vehicle:', err);
                    res.status(500).json({ error: 'Error assigning vehicle' });
                });
            }
            commitTransaction(res);
        });
    });
}

function commitTransaction(res) {
    connection.commit((err) => {
        if (err) {
            return connection.rollback(() => {
                console.error('Error committing transaction:', err);
                res.status(500).json({ error: 'Error updating rescuer account' });
            });
        }
        res.status(200).json({ message: 'Rescuer account updated successfully' });
    });
}

module.exports = router;