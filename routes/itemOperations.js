const connection = require('../db');

function updateItemQuantity(itemId, newQuantityBase, callback) {
    connection.beginTransaction((err) => {
        if (err) { return callback(err); }

        // Update items table
        connection.query('UPDATE items SET quantity = ? WHERE id = ?', [newQuantityBase, itemId], (err, result) => {
            if (err) {
                return connection.rollback(() => {
                    callback(err);
                });
            }

            // Update warehouse table
            connection.query('UPDATE warehouse SET quantity_base = ? WHERE item_id = ?',
                [newQuantityBase, itemId], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            callback(err);
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                callback(err);
                            });
                        }
                        callback(null, 'Item quantities updated successfully');
                    });
                });
        });
    });
}

function moveItemToVehicle(itemId, quantity, vehicleId, callback) {
    connection.beginTransaction((err) => {
        if (err) { return callback(err); }

        // First, update the warehouse (decrease base quantity)
        connection.query('UPDATE warehouse SET quantity_base = quantity_base - ? WHERE item_id = ?', [quantity, itemId], (err, result) => {
            if (err) {
                return connection.rollback(() => {
                    callback(err);
                });
            }

            // Then, update the vehicle's inventory
            connection.query('SELECT inventory FROM vehicles WHERE id = ?', [vehicleId], (err, results) => {
                if (err) {
                    return connection.rollback(() => {
                        callback(err);
                    });
                }

                let inventory = results[0].inventory ? JSON.parse(results[0].inventory) : {};
                inventory[itemId] = (inventory[itemId] || 0) + quantity;

                connection.query('UPDATE vehicles SET inventory = ? WHERE id = ?', [JSON.stringify(inventory), vehicleId], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            callback(err);
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                callback(err);
                            });
                        }
                        callback(null, 'Item moved to vehicle successfully');
                    });
                });
            });
        });
    });
}

function moveItemFromVehicle(itemId, quantity, vehicleId, callback) {
    connection.beginTransaction((err) => {
        if (err) { return callback(err); }

        // First, update the vehicle's inventory
        connection.query('SELECT inventory FROM vehicles WHERE id = ?', [vehicleId], (err, results) => {
            if (err) {
                return connection.rollback(() => {
                    callback(err);
                });
            }

            let inventory = results[0].inventory ? JSON.parse(results[0].inventory) : {};
            if (!inventory[itemId] || inventory[itemId] < quantity) {
                return connection.rollback(() => {
                    callback(new Error('Not enough quantity in vehicle'));
                });
            }

            inventory[itemId] -= quantity;
            if (inventory[itemId] === 0) {
                delete inventory[itemId];
            }

            connection.query('UPDATE vehicles SET inventory = ? WHERE id = ?', [JSON.stringify(inventory), vehicleId], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        callback(err);
                    });
                }

                // Then, update the warehouse (increase base quantity)
                connection.query('UPDATE warehouse SET quantity_base = quantity_base + ? WHERE item_id = ?', [quantity, itemId], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            callback(err);
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                callback(err);
                            });
                        }
                        callback(null, 'Item moved from vehicle successfully');
                    });
                });
            });
        });
    });
}

module.exports = {
    updateItemQuantity,
    moveItemToVehicle,
    moveItemFromVehicle
};