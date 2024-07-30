const express = require('express');
const router = express.Router();
const connection = require('../db');

router.get('/', (req, res) => {
    const sqlBases = 'SELECT id, name, latitude, longitude FROM bases';
    const sqlVehicles = `
        SELECT v.id, v.name as username, v.load_capacity as \`load\`, v.status, v.latitude, v.longitude,
               v.assigned_task_id, v.assigned_task_type,
               CASE
                   WHEN v.assigned_task_type = 'request' THEN r.latitude
                   WHEN v.assigned_task_type = 'offer' THEN o.latitude
               END as task_latitude,
               CASE
                   WHEN v.assigned_task_type = 'request' THEN r.longitude
                   WHEN v.assigned_task_type = 'offer' THEN o.longitude
               END as task_longitude
        FROM vehicles v
        LEFT JOIN requests r ON v.assigned_task_id = r.id AND v.assigned_task_type = 'request'
        LEFT JOIN offers o ON v.assigned_task_id = o.id AND v.assigned_task_type = 'offer'
    `;
    const sqlRequests = 'SELECT r.id, u.first_name as name, u.phone, r.date_registered as date, i.name as item, r.quantity, r.status, r.latitude, r.longitude, v.name as vehicle, r.collection_date FROM requests r LEFT JOIN users u ON r.user_id = u.id LEFT JOIN items i ON r.item_id = i.id LEFT JOIN vehicles v ON r.vehicle_id = v.id';
    const sqlOffers = 'SELECT o.id, u.first_name as name, u.phone, o.date_registered as date, i.name as item, o.quantity, o.status, o.latitude, o.longitude, v.name as vehicle, o.withdrawal_date FROM offers o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN items i ON o.item_id = i.id LEFT JOIN vehicles v ON o.vehicle_id = v.id';

    let mapData = {
        bases: [],
        vehicles: [],
        requests: [],
        offers: []
    };

    connection.query(sqlBases, (err, results) => {
        if (err) {
            console.error('Database error fetching bases: ', err);
            return res.status(500).json({ error: 'Error fetching bases' });
        }
        mapData.bases = results;

        connection.query(sqlVehicles, (err, results) => {
            if (err) {
                console.error('Database error fetching vehicles: ', err);
                return res.status(500).json({ error: 'Error fetching vehicles' });
            }
            mapData.vehicles = results;

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