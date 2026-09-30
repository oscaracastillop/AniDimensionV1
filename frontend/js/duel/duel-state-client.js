/**
 * Ani-Dimension: Estado Global Compartido del Cliente de Duelo
 */
window.currentSummonMode = 'ATK';
window.selectedHandCardIndex = -1;
window.selectedHandCardId = null;
window.selectedAttackerSlot = 0;
window.selectedRivalTargetSlot = -1;
window.lastDuelState = null;
window.selectedTributeSlots = [];
window.pendingTributeData = null;
window.chainTimerInterval = null;
window.targetSelectMode = null;
window.pendingDiscardData = null;
window.selectedDiscardIndices = [];
window.pendingRebornData = null;
window.diceRollInterval = null;
window.lastDiceWinner = null;
window.currentUser = (window.Session && window.Session.getUser()) || { id: 999, username: 'Admin', role: 'admin' };
var currentUser = window.currentUser;
