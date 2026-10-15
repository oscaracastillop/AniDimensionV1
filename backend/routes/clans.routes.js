const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
    getClansList,
    getMyClan,
    createClan,
    sendJoinRequest,
    handleJoinRequest,
    updateClanConfig,
    kickMember,
    changeRole,
    leaveClan,
    disbandClan
} = require('../controllers/clans.controller');

// Configuración de Multer para emblemas de clan
const uploadDir = path.resolve(__dirname, '../../frontend/assets/images/clans');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
        const ext = path.extname(file.originalname) || '.png';
        cb(null, 'emblem_' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máx
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    }
});

router.get('/list', getClansList);
router.get('/my-clan', getMyClan);
router.post('/create', upload.single('emblem'), createClan);
router.post('/:id/join-request', sendJoinRequest);
router.post('/:id/handle-request', handleJoinRequest);
router.put('/:id/update-config', updateClanConfig);
router.post('/:id/kick', kickMember);
router.post('/:id/role', changeRole);
router.post('/:id/leave', leaveClan);
router.post('/:id/disband', disbandClan);

module.exports = router;
