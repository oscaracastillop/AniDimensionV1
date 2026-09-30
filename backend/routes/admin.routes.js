const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Rutas de administración de usuarios y catálogo de países
router.get('/users', adminController.getUsers);
router.get('/countries', adminController.getCountries);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/toggle-active', adminController.toggleUserActive);
router.put('/users/:id/ban', adminController.banUser);

module.exports = router;

