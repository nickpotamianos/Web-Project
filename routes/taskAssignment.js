const express = require('express');
const router = express.Router();
const connection = require('../db');

function assignVehicleToTask(vehicleId, taskId, taskType) {
    return new Promise((resolve, reject) => {
        connection.beginTransaction(err => {
            if (err) {
                return reject(err);
            }

            const updateVehicleQuery = 'UPDATE vehicles SET assigned_task_id = ?, assigned_task_type = ? WHERE id = ?';
            const updateTaskQuery = `UPDATE ${taskType}s SET vehicle_id = ?, status = 'in_progress' WHERE id = ?`;

            connection.query(updateVehicleQuery, [taskId, taskType, vehicleId], (err) => {
                if (err) {
                    return connection.rollback(() => reject(err));
                }

                connection.query(updateTaskQuery, [vehicleId, taskId], (err) => {
                    if (err) {
                        return connection.rollback(() => reject(err));
                    }

                    connection.commit(err => {
                        if (err) {
                            return connection.rollback(() => reject(err));
                        }
                        resolve();
                    });
                });
            });
        });
    });
}

router.post('/assign', (req, res) => {
    const { vehicleId, taskId, taskType } = req.body;
    assignVehicleToTask(vehicleId, taskId, taskType)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;