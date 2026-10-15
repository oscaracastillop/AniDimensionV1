# Estándar Oficial de Desarrollo de Módulos de Efectos de Cartas (Ani Dimension)

Este documento define la arquitectura obligatoria, convenciones y patrones de diseño para la implementación de módulos nativos de efectos de cartas en JavaScript (`backend/engine/card_effects/`).

---

## 1. Filosofía y Arquitectura
- **Independencia de Lua WASM**: Cada carta con efecto programado posee su propio módulo nativo `.js`, eliminando la necesidad de emuladores C++/Lua WASM y garantizando ejecución síncrona/asíncrona en tiempo real con cero fugas de memoria.
- **Ubicación de Archivos**: `backend/engine/card_effects/c<passcode>.js`
  - Ejemplo: `backend/engine/card_effects/c72989439.js` (Black Luster Soldier - Envoy of the Beginning).
- **Exclusión de Monstruos Normales (Vanillas)**: Los monstruos normales sin efecto no requieren módulo propio; sus estadísticas y tipo son leídos directamente desde `cards.cdb` y SQL Server.

---

## 2. Estructura Estándar de un Módulo (`c<passcode>.js`)

Cada archivo debe exportar un objeto con las propiedades mínimas `id`, `name` y el método asíncrono `execute`:

```javascript
/**
 * [Passcode: 72989439] Black Luster Soldier - Envoy of the Beginning (IOC-025)
 */
module.exports = {
    id: 72989439,
    name: "Black Luster Soldier - Envoy of the Beginning",

    async execute(context) {
        const {
            roomId,
            duelState,
            player,
            opponent,
            playerKey,
            opponentKey,
            targetData,
            emitDuelLog,
            calculateMonsterCurrentStats,
            sendCardToGraveyard,
            sendCardToBanished
        } = context;

        // 1. Validaciones previas
        if (!duelState || !player) return false;

        // 2. Ejecución lógica del efecto (e.g. Desterrar monstruo objetivo)
        if (targetData && targetData.target_slot !== undefined) {
            const targetMon = opponent.monsters[targetData.target_slot];
            if (targetMon) {
                sendCardToBanished(duelState, targetMon, opponentKey);
                opponent.monsters[targetData.target_slot] = null;
                emitDuelLog(roomId, `⚔️🌌💥 [BLS - Enviado del Principio] ¡Desterró a "${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" de ${opponent.username}!`, 'effect');
                return true;
            }
        }

        return true;
    }
};
```

---

## 3. Parámetros del Objeto `context`

| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `roomId` | `string` | Identificador único de la sala de duelo actual. |
| `duelState` | `object` | Estado completo del duelo (`player1`, `player2`, `turnNumber`, `phase`, etc.). |
| `player` | `object` | Objeto del jugador que activa o controla el efecto (`hand`, `monsters`, `spells`, `graveyard`, `banished`, `lp`). |
| `opponent` | `object` | Objeto del jugador rival. |
| `playerKey` | `string` | `'player1'` o `'player2'`. |
| `opponentKey` | `string` | `'player2'` o `'player1'`. |
| `targetData` | `object` | Parámetros opcionales enviados por el cliente o IA (`target_slot`, `slot_index`, `is_spell_trap`, `declared_race`, etc.). |
| `emitDuelLog` | `function` | Función para registrar mensajes y animaciones en el historial del duelo. |
| `calculateMonsterCurrentStats` | `function` | Recalcula el ATK/DEF actual considerando efectos continuos, campos y equipos. |
| `sendCardToGraveyard` | `function` | Mueve una carta al Cementerio respetando propiedades de propietario. |
| `sendCardToBanished` | `function` | Mueve una carta a la Zona de Desterradas. |

---

## 4. Patrones de Implementación por Categoría de Carta

### A. Magia Normal de Robo / Búsqueda
```javascript
module.exports = {
    id: 55144522,
    name: "Pot of Greed",
    async execute({ roomId, duelState, player, emitDuelLog }) {
        if (!player.deck || player.deck.length < 2) return false;
        const c1 = player.deck.pop();
        const c2 = player.deck.pop();
        player.hand.push(c1, c2);
        player.mainDeckCount = player.deck.length;
        emitDuelLog(roomId, `🏺✨ [Olla de la Codicia] ${player.username} roba 2 cartas.`, 'spell');
        return true;
    }
};
```

### B. Trampa de Respuesta / Interrupción (e.g. Mirror Force)
```javascript
module.exports = {
    id: 44095762,
    name: "Mirror Force",
    async execute({ roomId, duelState, opponent, opponentKey, emitDuelLog, sendCardToGraveyard }) {
        let destroyedCount = 0;
        for (let i = 0; i < 5; i++) {
            const m = opponent.monsters[i];
            if (m && m.position === 'ATK') {
                sendCardToGraveyard(duelState, m, opponentKey);
                opponent.monsters[i] = null;
                destroyedCount++;
            }
        }
        emitDuelLog(roomId, `🛡️💥 [Fuerza de Espejo] ¡Destruyó todos los monstruos en Modo de Ataque de ${opponent.username} (${destroyedCount})!`, 'trap');
        return true;
    }
};
```

### C. Monstruo de Efecto de Volteo (FLIP)
```javascript
module.exports = {
    id: 54652250,
    name: "Man-Eater Bug",
    async execute({ roomId, duelState, opponent, opponentKey, targetData, emitDuelLog, sendCardToGraveyard }) {
        let targetSlot = targetData?.target_slot;
        if (targetSlot === undefined || !opponent.monsters[targetSlot]) {
            targetSlot = opponent.monsters.findIndex(m => m !== null);
        }
        if (targetSlot !== -1 && opponent.monsters[targetSlot]) {
            const targetMon = opponent.monsters[targetSlot];
            sendCardToGraveyard(duelState, targetMon, opponentKey);
            opponent.monsters[targetSlot] = null;
            emitDuelLog(roomId, `🐛💥 [Insecto Come-Hombres] Destruyó a "${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" de ${opponent.username}.`, 'effect');
            return true;
        }
        return false;
    }
};
```

### D. Monstruo con Contadores Mágicos / Ignición (e.g. Breaker)
```javascript
module.exports = {
    id: 71413901,
    name: "Breaker the Magical Warrior",
    async execute({ roomId, duelState, player, opponent, opponentKey, targetData, emitDuelLog, sendCardToGraveyard, calculateMonsterCurrentStats }) {
        const breaker = player.monsters.find(m => m && (m.card_id === 71413901 || (m.card_data && m.card_data.id === 71413901)));
        if (breaker && breaker.spellCounters > 0) {
            breaker.spellCounters--;
            calculateMonsterCurrentStats(breaker, duelState);
            
            let slot = targetData?.target_slot ?? opponent.spells.findIndex(s => s !== null);
            if (slot !== -1 && opponent.spells[slot]) {
                const targetSpell = opponent.spells[slot];
                sendCardToGraveyard(duelState, targetSpell, opponentKey);
                opponent.spells[slot] = null;
                emitDuelLog(roomId, `⚔️🔴💥 [Breaker the Magical Warrior] ¡Retiró su Contador Mágico y destruyó una Magia/Trampa de ${opponent.username}!`, 'effect');
                return true;
            }
        }
        return false;
    }
};
```

---

## 5. Reglas de Calidad y Buenas Prácticas
1. **Siempre validar existencia de objetivos**: No asumir que `opponent.monsters[i]` o `opponent.spells[i]` no es nulo.
2. **Actualizar contadores de deck**: Siempre que se robe o envíe al cementerio desde el deck, sincronizar `player.mainDeckCount = player.deck.length`.
3. **Recalcular estadísticas**: Cualquier cambio en campo, magia de equipo o tributo debe acompañarse de `calculateMonsterCurrentStats`.
4. **Formato de Logs**: Utilizar prefijos claros (`[Olla de la Codicia]`, `[Raigeki]`, `[Juicio Solemne]`) con emojis temáticos para fácil trazabilidad en auditorías.
5. **No lanzar excepciones no controladas**: Devolver `false` o manejar los casos bordes con gracia para prevenir congelamientos en el ciclo del duelo.
