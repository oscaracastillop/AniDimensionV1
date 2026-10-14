const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/force-logout', authController.forceLogout);
router.post('/unlock-session', authController.forceLogout);
router.post('/logout', authController.logout);
router.get('/verify-session', authController.verifySession);
router.post('/update-nick', authController.updateNick);
router.get('/me', authController.getMe);
router.get('/profile', authController.getMe);

module.exports = router;

