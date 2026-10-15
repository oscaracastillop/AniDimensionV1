/**
 * [Passcode: 44519536] Left Arm of the Forbidden One (Brazo Izquierdo del Prohibido)
 * Tipo: Normal Monster | Expansión: LOB
 * Descripción Oficial:
 * A forbidden left arm sealed by magic. Whosoever breaks this seal will know infinite power.
 */
module.exports = {
    id: 44519536,
    name: "Left Arm of the Forbidden One",
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
