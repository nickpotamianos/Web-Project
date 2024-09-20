const express = require('express');
const router = express.Router();
const connection = require('../db');

router.get('/', (req, res) => {
    const sqlBases = 'SELECT id, name, latitude, longitude FROM bases';
    const sqlVehicles = `
        SELECT v.id, v.name as username, v.status, v.latitude, v.longitude,
               v.inventory, v.assigned_task_id, v.assigned_task_type,
               GROUP_CONCAT(DISTINCT CONCAT(r.id, ',', r.latitude, ',', r.longitude, ',', i_r.name, ',', r.quantity) SEPARATOR ';') as request_tasks,
               GROUP_CONCAT(DISTINCT CONCAT(o.id, ',', o.latitude, ',', o.longitude, ',', i_o.name, ',', o.quantity) SEPARATOR ';') as offer_tasks
        FROM vehicles v
                 LEFT JOIN requests r ON FIND_IN_SET(r.id, v.assigned_task_id) > 0 AND v.assigned_task_type LIKE '%request%'
                 LEFT JOIN offers o ON FIND_IN_SET(o.id, v.assigned_task_id) > 0 AND v.assigned_task_type LIKE '%offer%'
                 LEFT JOIN items i_r ON r.item_id = i_r.id
                 LEFT JOIN items i_o ON o.item_id = i_o.id
        GROUP BY v.id, v.name, v.status, v.latitude, v.longitude, v.inventory, v.assigned_task_id, v.assigned_task_type
    `;
    const sqlRequests = `
    SELECT 
        r.id, 
        u.first_name as name, 
        u.phone, 
        r.date_registered as date, 
        i.name as item, 
        r.quantity, 
        COALESCE(r.status, 'unassigned') as status, 
        r.latitude, 
        r.longitude, 
        COALESCE(v.name, 
            (SELECT v2.name 
             FROM vehicles v2 
             WHERE FIND_IN_SET(r.id, v2.assigned_task_id) > 0 
               AND v2.assigned_task_type LIKE '%request%'
             LIMIT 1)
        ) as vehicle
    FROM requests r 
    LEFT JOIN users u ON r.user_id = u.id 
    LEFT JOIN items i ON r.item_id = i.id 
    LEFT JOIN vehicles v ON r.vehicle_id = v.id
`;

    const sqlOffers = `
        SELECT
            o.id,
            u.first_name as name,
            u.phone,
            o.date_registered as date, 
        i.name as item, 
        o.quantity, 
        COALESCE(o.status, 'unassigned') as status, 
        o.latitude, 
        o.longitude, 
        COALESCE(v.name, 
            (SELECT v2.name 
             FROM vehicles v2 
             WHERE FIND_IN_SET(o.id, v2.assigned_task_id) > 0 
               AND v2.assigned_task_type LIKE '%offer%'
             LIMIT 1)
        ) as vehicle, 
        o.withdrawal_date
        FROM offers o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN items i ON o.item_id = i.id
            LEFT JOIN vehicles v ON o.vehicle_id = v.id
    `;
    const sqlItems = 'SELECT id, name FROM items';

    let mapData = {
        bases: [],
        vehicles: [],
        requests: [],
        offers: [],
        items: {}
    };

    connection.query(sqlBases, (err, results) => {
        if (err) {
            console.error('Database error fetching bases: ', err);
            return res.status(500).json({ error: 'Error fetching bases' });
        }
        mapData.bases = results;

        connection.query(sqlItems, (err, results) => {
            if (err) {
                console.error('Database error fetching items: ', err);
                return res.status(500).json({ error: 'Error fetching items' });
            }
            results.forEach(item => {
                mapData.items[item.id] = item.name;
            });

            connection.query(sqlVehicles, (err, results) => {
                if (err) {
                    console.error('Database error fetching vehicles: ', err);
                    return res.status(500).json({ error: 'Error fetching vehicles', details: err.message });
                }
                mapData.vehicles = results.map(vehicle => ({
                    ...vehicle,
                    inventory: vehicle.inventory ? JSON.parse(vehicle.inventory) : {}
                }));

                connection.query(sqlRequests, (err, results) => {
                    if (err) {
                        console.error('Database error fetching requests: ', err);
                        return res.status(500).json({ error: 'Error fetching requests' });
                    }
                    mapData.requests = results;

                    connection.query(sqlOffers, (err, results) => {
                        if (err) {
                            console.error('Database error fetching offers: ', err);
                            return res.status(500).json({ error: 'Error fetching offers' });
                        }
                        mapData.offers = results;
                        res.status(200).json(mapData);
                    });
                });
            });
        });
    });
});
router.put('/bases/:id', (req, res) => {
    const baseId = req.params.id;
    const { latitude, longitude } = req.body;

    const sql = 'UPDATE bases SET latitude = ?, longitude = ? WHERE id = ?';
    connection.query(sql, [latitude, longitude, baseId], (err, result) => {
        if (err) {
            console.error('Database error updating base location: ', err);
            return res.status(500).json({ error: 'Error updating base location' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Base not found' });
        }
        res.status(200).json({ message: 'Base location updated successfully' });
    });
});
module.exports = router;