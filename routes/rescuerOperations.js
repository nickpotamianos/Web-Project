const express = require('express');
const router = express.Router();
const connection = require('../db'); // Adjust the path according to your db connection file

// Serve vehicle info for rescuer dashboard
router.get('/vehicle-info', (req, res) => {
    const userId = req.session.user.id;

    const vehicleSql = 'SELECT * FROM vehicles WHERE user_id = ?';
    connection.query(vehicleSql, [userId], (err, vehicleResults) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching vehicle information' });
        }
        const vehicle = vehicleResults[0];
        res.status(200).json({ vehicle });
    });
});

// Serve items info for load management
router.get('/items', (req, res) => {
    const itemsSql = 'SELECT * FROM items';
    connection.query(itemsSql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching items information' });
        }
        console.log('Fetched items:', results); // Log the fetched items to verify the format
        res.status(200).json({ items: results });
    });
});

// Fetch the base coordinates
router.get('/base-coordinates', (req, res) => {
    const baseSql = 'SELECT latitude, longitude FROM bases WHERE id = 1'; // Assuming base ID is 1
    connection.query(baseSql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching base coordinates' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Base not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Handle loading items into the vehicle
router.post('/load-items', (req, res) => {
    const { itemId, quantity } = req.body;
    const userId = req.session.user.id;

    // Check if the item exists and has enough quantity in the base
    const itemSql = 'SELECT * FROM items WHERE id = ?';
    connection.query(itemSql, [itemId], (err, itemResults) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching item information' });
        }
        if (itemResults.length === 0) {
            return res.status(400).json({ error: 'Item does not exist' });
        }
        const item = itemResults[0];
        if (item.quantity < parseInt(quantity)) {
            return res.status(400).json({ error: 'Not enough items in base inventory' });
        }

        // Fetch the rescuer's vehicle
        const vehicleSql = 'SELECT * FROM vehicles WHERE user_id = ?';
        connection.query(vehicleSql, [userId], (err, vehicleResults) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching vehicle information' });
            }

            const vehicle = vehicleResults[0];
            const inventory = JSON.parse(vehicle.inventory || '{}');

            // Check if item is already in inventory
            if (inventory[itemId]) {
                inventory[itemId] += parseInt(quantity);
            } else {
                inventory[itemId] = parseInt(quantity);
            }

            // Update vehicle inventory
            const updateVehicleSql = 'UPDATE vehicles SET inventory = ? WHERE id = ?';
            connection.query(updateVehicleSql, [JSON.stringify(inventory), vehicle.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error updating vehicle inventory' });
                }

                // Update base inventory
                const newBaseQuantity = item.quantity - parseInt(quantity);
                const updateItemSql = 'UPDATE items SET quantity = ? WHERE id = ?';
                connection.query(updateItemSql, [newBaseQuantity, itemId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error updating item quantity in base' });
                    }
                    res.status(200).json({ message: 'Items loaded successfully' });
                });
            });
        });
    });
});

// Handle unloading items from the vehicle
router.post('/unload-items', (req, res) => {
    const { itemId, quantity } = req.body;
    const userId = req.session.user.id;

    // Fetch the rescuer's vehicle
    const vehicleSql = 'SELECT * FROM vehicles WHERE user_id = ?';
    connection.query(vehicleSql, [userId], (err, vehicleResults) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching vehicle information' });
        }

        const vehicle = vehicleResults[0];
        const inventory = JSON.parse(vehicle.inventory || '{}');

        // Check if the item exists in the items table
        const checkItemSql = 'SELECT * FROM items WHERE id = ?';
        connection.query(checkItemSql, [itemId], (err, itemResults) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching item information' });
            }
            if (itemResults.length === 0) {
                return res.status(400).json({ error: 'Item does not exist' });
            }

            // Check if item is in the vehicle inventory
            if (!inventory[itemId] || inventory[itemId] < parseInt(quantity)) {
                return res.status(400).json({ error: 'Not enough items in vehicle inventory' });
            }

            // Update vehicle inventory
            inventory[itemId] -= parseInt(quantity);
            if (inventory[itemId] <= 0) {
                delete inventory[itemId];
            }

            const updateVehicleSql = 'UPDATE vehicles SET inventory = ? WHERE id = ?';
            connection.query(updateVehicleSql, [JSON.stringify(inventory), vehicle.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error updating vehicle inventory' });
                }

                // Update base inventory
                const item = itemResults[0];
                const newBaseQuantity = item.quantity + parseInt(quantity);
                const updateItemSql = 'UPDATE items SET quantity = ? WHERE id = ?';
                connection.query(updateItemSql, [newBaseQuantity, itemId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error updating item quantity in base' });
                    }
                    res.status(200).json({ message: 'Items unloaded successfully' });
                });
            });
        });
    });
});

module.exports = router;