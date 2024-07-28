const express = require('express');
const router = express.Router();
const connection = require('../db');

// Get map data
router.get('/', (req, res) => {
    const sqlBases = 'SELECT * FROM bases';
    const sqlVehicles = 'SELECT * FROM vehicles';
    const sqlRequests = 'SELECT * FROM requests';
    const sqlOffers = 'SELECT * FROM offers';

    let mapData = {
        bases: [],
        vehicles: [],
        requests: [],
        offers: []
    };

    connection.query(sqlBases, (err, results) => {
        if (err) {
            console.error('Database error: ', err);
            res.status(500).json({ error: 'Error fetching bases' });
            return;
        }
        mapData.bases = results;

        connection.query(sqlVehicles, (err, results) => {
            if (err) {
                console.error('Database error: ', err);
                res.status(500).json({ error: 'Error fetching vehicles' });
                return;
            }
            mapData.vehicles = results;

            connection.query(sqlRequests, (err, results) => {
                if (err) {
                    console.error('Database error: ', err);
                    res.status(500).json({ error: 'Error fetching requests' });
                    return;
                }
                mapData.requests = results;

                connection.query(sqlOffers, (err, results) => {
                    if (err) {
                        console.error('Database error: ', err);
                        res.status(500).json({ error: 'Error fetching offers' });
                        return;
                    }
                    mapData.offers = results;
                    res.status(200).json(mapData);
                });
            });
        });
    });
});

module.exports = router;
