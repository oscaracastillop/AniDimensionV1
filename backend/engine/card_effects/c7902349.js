/**
 * [Passcode: 7902349] Left Leg of the Forbidden One (Pierna Izquierda del Prohibido)
 * Tipo: Normal Monster | Expansión: LOB
 * Descripción Oficial:
 * A forbidden left leg sealed by magic. Whosoever breaks this seal will know infinite power.
 */
module.exports = {
    id: 7902349,
    name: "Left Leg of the Forbidden One",
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
