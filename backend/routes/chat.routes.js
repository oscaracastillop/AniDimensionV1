/**
 * Ani-Dimension: Rutas de Chat Global y Eventos en Vivo
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

router.get('/history', chatController.getChatHistory);
router.get('/online-users', chatController.getOnlineUsers);
router.delete('/message/:messageId', chatController.deleteChatMessage);
router.post('/clear-conversation', chatController.clearConversation);
router.get('/user-profile/:usernameOrId', chatController.getUserProfileDetails);
router.post('/preview-masked', chatController.previewMaskedPhrase);
router.post('/events/launch', chatController.launchEvent);
router.post('/events/cancel', chatController.cancelEvent);
router.get('/events/history', chatController.getEventsHistory);
router.post('/events/toggle-delivery', chatController.togglePrizeDelivery);
router.post('/mute', chatController.toggleChatMute);
router.post('/pin', chatController.setPinnedMessage);

module.exports = router;
