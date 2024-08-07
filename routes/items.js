const express = require('express');
const router = express.Router();
const connection = require('../db');

// Get all items with details
router.get('/', (req, res) => {
    const itemsSql = 'SELECT * FROM items';
    const detailsSql = 'SELECT * FROM item_details WHERE item_id IN (?)';

    connection.query(itemsSql, (err, items) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching items' });
        }

        const itemIds = items.map(item => item.id);
        if (itemIds.length === 0) {
            return res.json(items); // No items found, return empty array
        }

        connection.query(detailsSql, [itemIds], (err, details) => {
            if (err) {
                console.error('Error fetching item details:', err);
                return res.status(500).json({ error: 'Error fetching item details' });
            }

            const validDetails = details.filter(detail => detail.detail_name || detail.detail_value);

            const detailsByItemId = validDetails.reduce((acc, detail) => {
                if (!acc[detail.item_id]) {
                    acc[detail.item_id] = [];
                }
                acc[detail.item_id].push(detail);
                return acc;
            }, {});

            const itemsWithDetails = items.map(item => ({
                ...item,
                details: detailsByItemId[item.id] || []
            }));

            res.status(200).json(itemsWithDetails);
        });
    });
});

// Add a new item
router.post('/', (req, res) => {
    const { name, category_id, quantity, details } = req.body;
    if (!name || !category_id || quantity === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    connection.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        const sql = 'INSERT INTO items (name, category_id, quantity) VALUES (?, ?, ?)';
        connection.query(sql, [name, category_id, quantity], (err, results) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Database error: ', err);
                    res.status(500).json({ error: 'Error adding item' });
                });
            }

            const itemId = results.insertId;

            // If details are provided, insert them into item_details table
            if (details && details.length > 0) {
                const detailsSql = 'INSERT INTO item_details (item_id, detail_name, detail_value) VALUES ?';
                const detailsValues = details.map(detail => [itemId, detail.detail_name, detail.detail_value]);

                connection.query(detailsSql, [detailsValues], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Database error: ', err);
                            res.status(500).json({ error: 'Error adding item details' });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('Commit error: ', err);
                                res.status(500).json({ error: 'Error committing transaction' });
                            });
                        }
                        res.status(201).json({ message: 'Item added successfully', itemId: itemId });
                    });
                });
            } else {
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Commit error: ', err);
                            res.status(500).json({ error: 'Error committing transaction' });
                        });
                    }
                    res.status(201).json({ message: 'Item added successfully', itemId: itemId });
                });
            }
        });
    });
});

// Update an item
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, category_id, quantity } = req.body;
    if (!name || !category_id || quantity === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const sql = 'UPDATE items SET name = ?, category_id = ?, quantity = ? WHERE id = ?';
    connection.query(sql, [name, category_id, quantity, id], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error updating item' });
        }
        res.status(200).json({ message: 'Item updated successfully' });
    });
});

// Update item quantity
router.put('/:id/quantity', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
        return res.status(400).json({ error: 'Missing quantity' });
    }

    const sql = 'UPDATE items SET quantity = ? WHERE id = ?';
    connection.query(sql, [quantity, id], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error updating item quantity' });
        }
        res.status(200).json({ message: 'Item quantity updated successfully' });
    });
});
// New route to update item details
router.put('/:id/details', (req, res) => {
    const { id } = req.params;
    const { details } = req.body;

    if (!details || !Array.isArray(details)) {
        return res.status(400).json({ error: 'Invalid details format' });
    }

    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        // First, delete existing details for the item
        const deleteDetailsSql = 'DELETE FROM item_details WHERE item_id = ?';
        connection.query(deleteDetailsSql, [id], (err) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error deleting existing item details:', err);
                    res.status(500).json({ error: 'Error deleting existing item details' });
                });
            }

            // Then, insert new details
            if (details.length > 0) {
                const insertDetailsSql = 'INSERT INTO item_details (item_id, detail_name, detail_value) VALUES ?';
                const detailsValues = details.map(detail => [id, detail.detail_name, detail.detail_value]);

                connection.query(insertDetailsSql, [detailsValues], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error inserting new item details:', err);
                            res.status(500).json({ error: 'Error inserting new item details' });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('Error committing transaction:', err);
                                res.status(500).json({ error: 'Error committing transaction' });
                            });
                        }
                        res.status(200).json({ message: 'Item details updated successfully' });
                    });
                });
            } else {
                // If no new details, just commit the transaction
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).json({ error: 'Error committing transaction' });
                        });
                    }
                    res.status(200).json({ message: 'Item details updated successfully' });
                });
            }
        });
    });
});
// Delete an item
// Delete an individual item
// Delete an individual item
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        // Delete related offers
        const deleteOffersSql = 'DELETE FROM offers WHERE item_id = ?';
        connection.query(deleteOffersSql, [id], (err) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error deleting related offers:', err);
                    res.status(500).json({ error: 'Error deleting related offers' });
                });
            }

            // Delete related requests
            const deleteRequestsSql = 'DELETE FROM requests WHERE item_id = ?';
            connection.query(deleteRequestsSql, [id], (err) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error('Error deleting related requests:', err);
                        res.status(500).json({ error: 'Error deleting related requests' });
                    });
                }

                // Delete from announcement_items
                const deleteAnnouncementItemsSql = 'DELETE FROM announcement_items WHERE item_id = ?';
                connection.query(deleteAnnouncementItemsSql, [id], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error deleting from announcement_items:', err);
                            res.status(500).json({ error: 'Error deleting from announcement_items' });
                        });
                    }

                    // Delete item details
                    const deleteDetailsSql = 'DELETE FROM item_details WHERE item_id = ?';
                    connection.query(deleteDetailsSql, [id], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('Error deleting item details:', err);
                                res.status(500).json({ error: 'Error deleting item details' });
                            });
                        }

                        // Delete from warehouse
                        const deleteWarehouseSql = 'DELETE FROM warehouse WHERE item_id = ?';
                        connection.query(deleteWarehouseSql, [id], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    console.error('Error deleting from warehouse:', err);
                                    res.status(500).json({ error: 'Error deleting from warehouse' });
                                });
                            }

                            // Finally, delete the item
                            const deleteItemSql = 'DELETE FROM items WHERE id = ?';
                            connection.query(deleteItemSql, [id], (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error('Error deleting item:', err);
                                        res.status(500).json({ error: 'Error deleting item' });
                                    });
                                }

                                connection.commit((err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            console.error('Error committing transaction:', err);
                                            res.status(500).json({ error: 'Error committing transaction' });
                                        });
                                    }
                                    res.status(200).json({ message: 'Item deleted successfully' });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Delete a category and all its items
router.delete('/category/:categoryId', (req, res) => {
    const { categoryId } = req.params;

    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        // Get all items in the category
        const getItemsSql = 'SELECT id FROM items WHERE category_id = ?';
        connection.query(getItemsSql, [categoryId], (err, items) => {
            if (err) {
                return connection.rollback(() => {
                    console.error('Error fetching items in category:', err);
                    res.status(500).json({ error: 'Error fetching items in category' });
                });
            }

            const itemIds = items.map(item => item.id);

            // Delete related offers
            const deleteOffersSql = 'DELETE FROM offers WHERE item_id IN (?)';
            connection.query(deleteOffersSql, [itemIds], (err) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error('Error deleting related offers:', err);
                        res.status(500).json({ error: 'Error deleting related offers' });
                    });
                }

                // Delete related requests
                const deleteRequestsSql = 'DELETE FROM requests WHERE item_id IN (?)';
                connection.query(deleteRequestsSql, [itemIds], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error deleting related requests:', err);
                            res.status(500).json({ error: 'Error deleting related requests' });
                        });
                    }

                    // Delete item details
                    const deleteDetailsSql = 'DELETE FROM item_details WHERE item_id IN (?)';
                    connection.query(deleteDetailsSql, [itemIds], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error('Error deleting item details:', err);
                                res.status(500).json({ error: 'Error deleting item details' });
                            });
                        }

                        // Delete from warehouse
                        const deleteWarehouseSql = 'DELETE FROM warehouse WHERE item_id IN (?)';
                        connection.query(deleteWarehouseSql, [itemIds], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    console.error('Error deleting from warehouse:', err);
                                    res.status(500).json({ error: 'Error deleting from warehouse' });
                                });
                            }

                            // Delete the items
                            const deleteItemsSql = 'DELETE FROM items WHERE category_id = ?';
                            connection.query(deleteItemsSql, [categoryId], (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error('Error deleting items:', err);
                                        res.status(500).json({ error: 'Error deleting items' });
                                    });
                                }

                                // Finally, delete the category
                                const deleteCategorySql = 'DELETE FROM categories WHERE id = ?';
                                connection.query(deleteCategorySql, [categoryId], (err) => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            console.error('Error deleting category:', err);
                                            res.status(500).json({ error: 'Error deleting category' });
                                        });
                                    }

                                    connection.commit((err) => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                console.error('Error committing transaction:', err);
                                                res.status(500).json({ error: 'Error committing transaction' });
                                            });
                                        }
                                        res.status(200).json({ message: 'Category and all its items deleted successfully' });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
router.post('/:id/move-to-vehicle', (req, res) => {
    const { id } = req.params;
    const { quantity, vehicleId } = req.body;

    if (!quantity || !vehicleId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    connection.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        // First, update the warehouse quantity
        const updateWarehouseSql = 'UPDATE warehouse SET quantity_base = quantity_base - ? WHERE item_id = ?';
        connection.query(updateWarehouseSql, [quantity, id], (err, result) => {
            if (err) {
                return connection.rollback(() => {
                    res.status(500).json({ error: 'Error updating warehouse quantity' });
                });
            }

            // Then, update the vehicle's inventory
            const getVehicleSql = 'SELECT inventory FROM vehicles WHERE id = ?';
            connection.query(getVehicleSql, [vehicleId], (err, results) => {
                if (err) {
                    return connection.rollback(() => {
                        res.status(500).json({ error: 'Error fetching vehicle inventory' });
                    });
                }

                let inventory = results[0].inventory ? JSON.parse(results[0].inventory) : {};
                inventory[id] = (inventory[id] || 0) + parseInt(quantity);

                const updateVehicleSql = 'UPDATE vehicles SET inventory = ? WHERE id = ?';
                connection.query(updateVehicleSql, [JSON.stringify(inventory), vehicleId], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            res.status(500).json({ error: 'Error updating vehicle inventory' });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                res.status(500).json({ error: 'Error committing transaction' });
                            });
                        }
                        res.status(200).json({ message: 'Item moved to vehicle successfully' });
                    });
                });
            });
        });
    });
});

// New route to move item from vehicle to warehouse
router.post('/:id/move-from-vehicle', (req, res) => {
    const { id } = req.params;
    const { quantity, vehicleId } = req.body;

    if (!quantity || !vehicleId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    connection.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error starting transaction' });
        }

        // First, update the vehicle's inventory
        const getVehicleSql = 'SELECT inventory FROM vehicles WHERE id = ?';
        connection.query(getVehicleSql, [vehicleId], (err, results) => {
            if (err) {
                return connection.rollback(() => {
                    res.status(500).json({ error: 'Error fetching vehicle inventory' });
                });
            }

            let inventory = results[0].inventory ? JSON.parse(results[0].inventory) : {};
            if (!inventory[id] || inventory[id] < quantity) {
                return connection.rollback(() => {
                    res.status(400).json({ error: 'Not enough quantity in vehicle' });
                });
            }

            inventory[id] -= parseInt(quantity);
            if (inventory[id] === 0) {
                delete inventory[id];
            }

            const updateVehicleSql = 'UPDATE vehicles SET inventory = ? WHERE id = ?';
            connection.query(updateVehicleSql, [JSON.stringify(inventory), vehicleId], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        res.status(500).json({ error: 'Error updating vehicle inventory' });
                    });
                }

                // Then, update the warehouse quantity
                const updateWarehouseSql = 'UPDATE warehouse SET quantity_base = quantity_base + ? WHERE item_id = ?';
                connection.query(updateWarehouseSql, [quantity, id], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            res.status(500).json({ error: 'Error updating warehouse quantity' });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                res.status(500).json({ error: 'Error committing transaction' });
                            });
                        }
                        res.status(200).json({ message: 'Item moved from vehicle successfully' });
                    });
                });
            });
        });
    });
});

// New route to get total quantity (warehouse + all vehicles)
router.get('/:id/total-quantity', (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT 
            i.quantity AS total_quantity,
            w.quantity_base AS warehouse_quantity,
            COALESCE(SUM(JSON_EXTRACT(v.inventory, CONCAT('$."', i.id, '"'))), 0) AS vehicle_quantity
        FROM 
            items i
        LEFT JOIN 
            warehouse w ON i.id = w.item_id
        LEFT JOIN 
            vehicles v ON JSON_CONTAINS_PATH(v.inventory, 'one', CONCAT('$."', i.id, '"')) = 1
        WHERE 
            i.id = ?
        GROUP BY 
            i.id, i.quantity, w.quantity_base
    `;

    connection.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching total quantity' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const { total_quantity, warehouse_quantity, vehicle_quantity } = results[0];
        res.status(200).json({
            total_quantity: parseInt(total_quantity),
            warehouse_quantity: parseInt(warehouse_quantity),
            vehicle_quantity: parseInt(vehicle_quantity)
        });
    });
});
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const itemSql = 'SELECT * FROM items WHERE id = ?';
    const detailsSql = 'SELECT * FROM item_details WHERE item_id = ?';

    connection.query(itemSql, [id], (err, items) => {
        if (err) {
            console.error('Database error: ', err);
            return res.status(500).json({ error: 'Error fetching item' });
        }

        if (items.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        connection.query(detailsSql, [id], (err, details) => {
            if (err) {
                console.error('Error fetching item details:', err);
                return res.status(500).json({ error: 'Error fetching item details' });
            }

            const item = items[0];
            item.details = details;

            res.status(200).json(item);
        });
    });
});

module.exports = router;
