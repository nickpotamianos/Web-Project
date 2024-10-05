const express = require('express');
const router = express.Router();
const connection = require('../db');

// Middleware to get user ID from session
router.use((req, res, next) => {
    if (req.session && req.session.user && req.session.user.id) {
        req.userId = req.session.user.id;
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
});

// Route to get bases, vehicles, offers, and requests data
router.get('/', (req, res) => {
    const userId = req.userId;
    const sqlBases = 'SELECT id, name, latitude, longitude FROM bases';
    const sqlVehicles = `
        SELECT v.id, v.name as username, v.status, v.latitude, v.longitude,
               v.inventory, v.assigned_task_id, v.assigned_task_type
        FROM vehicles v
        WHERE v.user_id = ?
    `;
    const sqlOffers = `
        SELECT o.id, o.latitude, o.longitude, o.vehicle_id, o.date_registered as date, o.status,
               u.first_name AS citizenName, u.phone, i.name as itemName, o.quantity,
               o.withdrawal_date, v.name as vehicle
        FROM offers o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN items i ON o.item_id = i.id
            LEFT JOIN vehicles v ON o.vehicle_id = v.id
        WHERE o.vehicle_id IS NULL OR o.vehicle_id = (SELECT id FROM vehicles WHERE user_id = ?)
    `;
    const sqlRequests = `
        SELECT r.id, r.latitude, r.longitude, r.vehicle_id, r.date_registered as date, r.status,
               u.first_name AS citizenName, u.phone, i.name as itemName, r.quantity,
                v.name as vehicle
        FROM requests r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN items i ON r.item_id = i.id
            LEFT JOIN vehicles v ON r.vehicle_id = v.id
        WHERE r.vehicle_id IS NULL OR r.vehicle_id = (SELECT id FROM vehicles WHERE user_id = ?)
    `;
    const sqlItems = 'SELECT id, name FROM items';

    let mapData = {
        bases: [],
        vehicles: [],
        offers: [],
        requests: [],
        items: []
    };

    connection.query(sqlBases, (err, results) => {
        if (err) {
            console.error('Database error fetching bases: ', err);
            return res.status(500).json({ error: 'Error fetching bases' });
        }
        mapData.bases = results;

        connection.query(sqlVehicles, [userId], (err, results) => {
            if (err) {
                console.error('Database error fetching vehicles: ', err);
                return res.status(500).json({ error: 'Error fetching vehicles', details: err.message });
            }
            mapData.vehicles = results.map(vehicle => ({
                ...vehicle,
                inventory: vehicle.inventory ? JSON.parse(vehicle.inventory) : {}
            }));

            connection.query(sqlOffers, [userId], (err, results) => {
                if (err) {
                    console.error('Database error fetching offers: ', err);
                    return res.status(500).json({ error: 'Error fetching offers', details: err.message });
                }
                mapData.offers = results;

                connection.query(sqlRequests, [userId], (err, results) => {
                    if (err) {
                        console.error('Database error fetching requests: ', err);
                        return res.status(500).json({ error: 'Error fetching requests', details: err.message });
                    }
                    mapData.requests = results;

                    connection.query(sqlItems, (err, results) => {
                        if (err) {
                            console.error('Database error fetching items: ', err);
                            return res.status(500).json({ error: 'Error fetching items' });
                        }
                        mapData.items = results;
                        res.status(200).json(mapData);
                    });
                });
            });
        });
    });
});

router.get('/task/:id', (req, res) => {
    const taskId = req.params.id;

    const sqlTask = `
        SELECT r.id, r.latitude, r.longitude, r.vehicle_id, r.date_registered as date, r.status,
               u.first_name AS citizenName, u.phone, i.name as itemName, r.quantity
        FROM requests r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN items i ON r.item_id = i.id
        WHERE r.id = ?
        UNION ALL
        SELECT o.id, o.latitude, o.longitude, o.vehicle_id, o.date_registered as date, o.status,
               u.first_name AS citizenName, u.phone, i.name as itemName, o.quantity,
               o.withdrawal_date as collection_date
        FROM offers o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN items i ON o.item_id = i.id
        WHERE o.id = ?;
    `;

    connection.query(sqlTask, [taskId, taskId], (err, results) => {
        if (err) {
            console.error('Database error fetching task details: ', err);
            return res.status(500).json({ error: 'Error fetching task details' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(200).json(results[0]);
    });
});

router.put('/vehicles/:id', (req, res) => {
    const vehicleId = req.params.id;
    const { latitude, longitude } = req.body;
    const userId = req.userId;

    const sqlUpdateVehicle = 'UPDATE vehicles SET latitude = ?, longitude = ? WHERE id = ? AND user_id = ?';
    connection.query(sqlUpdateVehicle, [latitude, longitude, vehicleId, userId], (err, result) => {
        if (err) {
            console.error('Database error updating vehicle location: ', err);
            return res.status(500).json({ error: 'Error updating vehicle location' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Vehicle not found or not authorized' });
        }
        res.status(200).json({ message: 'Vehicle location updated successfully' });
    });
});

router.post('/assign-task', (req, res) => {
    const { taskId, taskType } = req.body;
    const userId = req.userId;

    const sqlGetVehicleId = 'SELECT id FROM vehicles WHERE user_id = ?';
    connection.query(sqlGetVehicleId, [userId], (err, results) => {
        if (err) {
            console.error('Database error fetching vehicle ID: ', err);
            return res.status(500).json({ error: 'Error fetching vehicle ID' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'No vehicle found for this user' });
        }

        const vehicleId = results[0].id;

        const sql = `CALL assign_task_to_vehicle(?, ?, ?)`;
        connection.query(sql, [taskId, taskType, vehicleId], (err, results) => {
            if (err) {
                console.error('Database error assigning task to vehicle: ', err);
                return res.status(500).json({ error: 'Error assigning task to vehicle' });
            }
            res.status(200).json({ message: 'Task assigned to vehicle successfully' });
        });
    });
});

// Route to get the task count for the vehicle
router.get('/vehicle-tasks-count', (req, res) => {
    const userId = req.userId;

    const sqlGetVehicleId = 'SELECT id FROM vehicles WHERE user_id = ?';
    connection.query(sqlGetVehicleId, [userId], (err, results) => {
        if (err) {
            console.error('Database error fetching vehicle ID: ', err);
            return res.status(500).json({ error: 'Error fetching vehicle ID' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'No vehicle found for this user' });
        }

        const vehicleId = results[0].id;

        const sqlGetTaskCount = `
            SELECT
                (SELECT COUNT(*) FROM offers WHERE vehicle_id = ?) +
                (SELECT COUNT(*) FROM requests WHERE vehicle_id = ?) AS taskCount
        `;
        connection.query(sqlGetTaskCount, [vehicleId, vehicleId], (err, results) => {
            if (err) {
                console.error('Database error fetching task count: ', err);
                return res.status(500).json({ error: 'Error fetching task count' });
            }
            res.status(200).json({ taskCount: results[0].taskCount });
        });
    });
});

router.post('/complete-task', (req, res) => {
    const { taskId, taskType } = req.body;
    const userId = req.userId;

    const sqlGetVehicleId = 'SELECT id, inventory FROM vehicles WHERE user_id = ?';
    connection.query(sqlGetVehicleId, [userId], (err, results) => {
        if (err) {
            console.error('Database error fetching vehicle ID: ', err);
            return res.status(500).json({ error: 'Error fetching vehicle ID' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'No vehicle found for this user' });
        }

        const vehicleId = results[0].id;
        const vehicleInventory = results[0].inventory ? JSON.parse(results[0].inventory) : {};

        if (taskType === 'request') {
            const sqlGetRequestDetails = 'SELECT item_id, quantity FROM requests WHERE id = ?';
            connection.query(sqlGetRequestDetails, [taskId], (err, results) => {
                if (err) {
                    console.error('Database error fetching request details: ', err);
                    return res.status(500).json({ error: 'Error fetching request details' });
                }

                const { item_id, quantity } = results[0];

                // Check if the vehicle has enough inventory to complete the request
                if (!vehicleInventory[item_id] || vehicleInventory[item_id] < quantity) {
                    return res.status(400).json({ error: 'Vehicle does not have the necessary items to complete this request' });
                }

                // Proceed with task completion if inventory is sufficient
                const sql = `CALL task_completion(?, ?, ?)`;
                connection.query(sql, [taskId, taskType, vehicleId], (err, results) => {
                    if (err) {
                        console.error('Database error completing task: ', err);
                        return res.status(500).json({ error: 'Error completing task' });
                    }

                    const sqlUpdateRequest = 'UPDATE requests SET date_collected = NOW() WHERE id = ?';
                    connection.query(sqlUpdateRequest, [taskId], (err, results) => {
                        if (err) {
                            console.error('Database error updating request date_collected: ', err);
                            return res.status(500).json({ error: 'Error updating request date_collected' });
                        }
                        res.status(200).json({ message: 'Task completed and date_collected updated successfully' });
                    });
                });
            });
        } else {
            const sql = `CALL task_completion(?, ?, ?)`;
            connection.query(sql, [taskId, taskType, vehicleId], (err, results) => {
                if (err) {
                    console.error('Database error completing task: ', err);
                    return res.status(500).json({ error: 'Error completing task' });
                }
                res.status(200).json({ message: 'Task completed successfully' });
            });
        }
    });
});

router.post('/cancel-task', (req, res) => {
    const { taskId, taskType } = req.body;

    const sql = `CALL cancel_task(?, ?)`;
    connection.query(sql, [taskId, taskType], (err, results) => {
        if (err) {
            console.error('Database error canceling task: ', err);
            return res.status(500).json({ error: 'Error canceling task' });
        }
        res.status(200).json({ message: 'Task canceled successfully' });
    });
});

module.exports = router;