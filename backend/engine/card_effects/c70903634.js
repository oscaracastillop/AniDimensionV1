/**
 * [Passcode: 70903634] Right Leg of the Forbidden One (Pierna Derecha del Prohibido)
 * Tipo: Normal Monster | Expansión: LOB
 * Descripción Oficial:
 * A forbidden right leg sealed by magic. Whosoever breaks this seal will know infinite power.
 */
module.exports = {
    id: 70903634,
    name: "Right Leg of the Forbidden One",
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
