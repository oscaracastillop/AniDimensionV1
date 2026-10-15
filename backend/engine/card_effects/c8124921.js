/**
 * [Passcode: 8124921] Right Arm of the Forbidden One (Brazo Derecho del Prohibido)
 * Tipo: Normal Monster | Expansión: LOB
 * Descripción Oficial:
 * A forbidden right arm sealed by magic. Whosoever breaks this seal will know infinite power.
 */
module.exports = {
    id: 8124921,
    name: "Right Arm of the Forbidden One",
    type: "Normal Monster",
    atk: 200,
    def: 300,
    level: 1,
    race: "Spellcaster",
    isExodiaPiece: true,
    isVanilla: true,

    canActivate() {
        return { canActivate: false, reason: "Los monstruos normales no poseen efectos activables." };
    }
};
