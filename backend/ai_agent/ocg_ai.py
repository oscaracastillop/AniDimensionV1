"""
Ani-Dimension: Agente IA Profesional de Duelos Yu-Gi-Oh OCG (Python Engine)
Soporta Niveles de Dificultad 5, 15, 30, 50 y 100 (Yami Yugi - Rey de los Juegos).
Toma decisiones estratégicas de combos, sacrificios, cadenas LIFO, magias y trampas.
"""

import sys
import json
import math
import random
from typing import Dict, List, Any, Optional, Tuple

class OcgAiAgent:
    def __init__(self, level: int = 30):
        self.level = level
        self.name = f"Yugi Muto (Nv. {level})" if level < 100 else "Yami Yugi (Nv. 100)"

    def evaluate_board_state(self, state: Dict[str, Any], player_key: str) -> float:
        """
        Función de Evaluación Heurística de Estado de Tablero OCG:
        Retorna una puntuación numérica alta cuando el jugador tiene ventaja táctica.
        """
        opponent_key = 'player2' if player_key == 'player1' else 'player1'
        me = state.get(player_key, {})
        opp = state.get(opponent_key, {})

        if not me or not opp:
            return 0.0

        # 1. Puntos de Vida (LP)
        lp_score = (me.get('lp', 8000) - opp.get('lp', 8000)) / 80.0

        # 2. Ventaja de Mano (Card Advantage)
        hand_score = len(me.get('hand', [])) * 15.0 - len(opp.get('hand', [])) * 12.0

        # 3. Potencia de Ataque en Campo (Field Dominance)
        my_atk = 0
        for m in me.get('monsters', []):
            if m:
                if m.get('position') == 'ATK' and not m.get('isTrapped', False):
                    my_atk += m.get('currentAtk', m.get('card_data', {}).get('atk', 0) or 0)
                else:
                    my_atk += (m.get('currentDef', m.get('card_data', {}).get('def', 0) or 0) * 0.5)

        opp_atk = 0
        for m in opp.get('monsters', []):
            if m:
                if m.get('position') == 'ATK' and not m.get('isTrapped', False):
                    opp_atk += m.get('currentAtk', m.get('card_data', {}).get('atk', 0) or 0)
                else:
                    opp_atk += (m.get('currentDef', m.get('card_data', {}).get('def', 0) or 0) * 0.5)

        field_score = (my_atk - opp_atk) / 100.0

        # 4. Trampas y Magias colocadas (Backrow Pressure)
        my_backrow = sum(1 for s in me.get('spells', []) if s is not None)
        opp_backrow = sum(1 for s in s for s in opp.get('spells', []) if s is not None)
        backrow_score = (my_backrow * 10.0) - (opp_backrow * 8.0)

        # 5. Bonus por Nivel de IA (Inteligencia / Profundidad)
        total_eval = lp_score + hand_score + field_score + backrow_score
        return round(total_eval, 2)

    def select_best_action(self, state: Dict[str, Any], player_key: str = 'player2') -> Dict[str, Any]:
        """
        Selecciona la mejor acción legal en función del estado actual y el nivel del agente.
        """
        phase = state.get('phase', 'MAIN_1')
        chain_window = state.get('chainWindowActive', False)

        if chain_window or state.get('activeChain'):
            return self._decide_chain_response(state, player_key)

        if phase in ['MAIN_1', 'MAIN_2']:
            return self._decide_main_phase(state, player_key)
        elif phase == 'BATTLE':
            return self._decide_battle_phase(state, player_key)

        return {'action_type': 'PASS_PHASE'}

    def _decide_main_phase(self, state: Dict[str, Any], player_key: str) -> Dict[str, Any]:
        opponent_key = 'player2' if player_key == 'player1' else 'player1'
        me = state.get(player_key, {})
        opp = state.get(opponent_key, {})
        hand = me.get('hand', [])
        monsters = me.get('monsters', [])
        spells = me.get('spells', [])
        normal_summon_used = state.get('normalSummonUsed', False)
        turn_number = state.get('turnNumber', 1)

        # --- NIVEL 30+: COMBO DE ACTIVACIÓN DE MAGIAS PRIMERO ---
        if self.level >= 15:
            # 1. Pot of Greed (55144522) - Robar 2 cartas siempre primero
            pot_idx = next((i for i, c in enumerate(hand) if (c.get('id') or c.get('card_id')) == 55144522), None)
            if pot_idx is not None:
                return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': pot_idx, 'card_id': 55144522}

            # 2. Raigeki (12580477) - Si el rival tiene monstruos en campo
            if any(m is not None for m in opp.get('monsters', [])):
                raigeki_idx = next((i for i, c in enumerate(hand) if (c.get('id') or c.get('card_id')) == 12580477), None)
                if raigeki_idx is not None:
                    return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': raigeki_idx, 'card_id': 12580477}

            # 3. Dark Hole (53129443) - Si el rival tiene más o mejores monstruos
            opp_monsters_count = sum(1 for m in opp.get('monsters', []) if m is not None)
            my_monsters_count = sum(1 for m in monsters if m is not None)
            if opp_monsters_count > my_monsters_count or (opp_monsters_count > 0 and my_monsters_count == 0):
                dh_idx = next((i for i, c in enumerate(hand) if (c.get('id') or c.get('card_id')) == 53129443), None)
                if dh_idx is not None:
                    return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': dh_idx, 'card_id': 53129443}

            # 4. Monster Reborn (83764718) - Resucitar mejor monstruo si hay casillas libres
            if any(m is None for m in monsters):
                all_gy = (me.get('graveyard', []) or []) + (opp.get('graveyard', []) or [])
                has_monsters_in_gy = any(c.get('type') and 'Monster' in c.get('type') for c in all_gy)
                if has_monsters_in_gy:
                    mr_idx = next((i for i, c in enumerate(hand) if (c.get('id') or c.get('card_id')) == 83764718), None)
                    if mr_idx is not None:
                        return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': mr_idx, 'card_id': 83764718}

            # 5. Yami (59197169) - Activar Campo si no está activo
            if me.get('fieldSpell') is None:
                yami_idx = next((i for i, c in enumerate(hand) if (c.get('id') or c.get('card_id')) == 59197169), None)
                if yami_idx is not None:
                    return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': yami_idx, 'card_id': 59197169}

            # 6. Mystical Space Typhoon (05318639 / 5318639) - Destruir S/T rival
            if any(s is not None for s in opp.get('spells', [])) or opp.get('fieldSpell') is not None:
                mst_idx = next((i for i, c in enumerate(hand) if (c.get('id') or c.get('card_id')) in [5318639, 5318639]), None)
                if mst_idx is not None:
                    return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': mst_idx, 'card_id': 5318639}

        # --- INVOCACIÓN NORMAL / TRIBUTO (SI NO HA USADO INVOCACIÓN DE TURNO) ---
        if not normal_summon_used:
            monsters_in_hand = [(i, c) for i, c in enumerate(hand) if c.get('type') and 'Monster' in c.get('type')]
            occupied_slots = [i for i, m in enumerate(monsters) if m is not None]
            empty_slots = [i for i, m in enumerate(monsters) if m is None]

            # Invocación por 2 Tributos (Nivel 7+, ej: Blue-Eyes, Dark Magician)
            if len(occupied_slots) >= 2:
                boss_monster = next((item for item in monsters_in_hand if (item[1].get('level') or 0) >= 7), None)
                if boss_monster:
                    return {
                        'action_type': 'SUMMON_MONSTER',
                        'hand_index': boss_monster[0],
                        'tribute_slots': occupied_slots[:2],
                        'position': 'ATK'
                    }

            # Invocación por 1 Tributo (Nivel 5-6, ej: Summoned Skull, Curse of Dragon)
            if len(occupied_slots) >= 1:
                mid_monster = next((item for item in monsters_in_hand if (item[1].get('level') or 0) in [5, 6]), None)
                if mid_monster:
                    return {
                        'action_type': 'SUMMON_MONSTER',
                        'hand_index': mid_monster[0],
                        'tribute_slots': [occupied_slots[0]],
                        'position': 'ATK'
                    }

            # Invocación Normal sin tributo (Nivel 1 a 4)
            if len(empty_slots) > 0:
                low_monsters = [item for item in monsters_in_hand if (item[1].get('level') or 4) <= 4]
                if low_monsters:
                    # En niveles altos (50 y 100), ordenar por mayor ATK
                    if self.level >= 50:
                        low_monsters.sort(key=lambda x: x[1].get('atk', 0) or 0, reverse=True)

                    chosen = low_monsters[0]
                    atk = chosen[1].get('atk', 0) or 0
                    def_val = chosen[1].get('def', 0) or 0
                    pos = 'DEF' if (def_val > atk and self.level >= 30) else 'ATK'

                    return {
                        'action_type': 'SUMMON_MONSTER',
                        'hand_index': chosen[0],
                        'tribute_slots': [],
                        'position': pos
                    }

        # --- COLOCAR TRAMPAS / MAGIAS SET EN LA SEGUNDA LÍNEA DE DEFENSA ---
        empty_st_slots = [i for i, s in enumerate(spells) if s is None]
        if empty_st_slots:
            st_in_hand = next((i for i, c in enumerate(hand) if c.get('type') and ('Trap' in c.get('type') or 'Quick-Play' in c.get('type'))), None)
            if st_in_hand is not None:
                return {
                    'action_type': 'SET_SPELL_TRAP',
                    'hand_index': st_in_hand,
                    'target_slot': empty_st_slots[0]
                }

        # Pasamos a Battle Phase si es posible (Turno > 1 y tenemos monstruos en ATK)
        if turn_number > 1 and any(m is not None and m.get('position') == 'ATK' and not m.get('isTrapped') for m in monsters):
            return {'action_type': 'CHANGE_PHASE', 'target_phase': 'BATTLE'}

        # De lo contrario terminar turno (END PHASE)
        return {'action_type': 'CHANGE_PHASE', 'target_phase': 'END'}

    def _decide_battle_phase(self, state: Dict[str, Any], player_key: str) -> Dict[str, Any]:
        opponent_key = 'player2' if player_key == 'player1' else 'player1'
        me = state.get(player_key, {})
        opp = state.get(opponent_key, {})
        my_monsters = me.get('monsters', [])
        opp_monsters = opp.get('monsters', [])

        # Buscar atacantes disponibles en mi campo
        available_attackers = [
            (i, m) for i, m in enumerate(my_monsters)
            if m is not None and m.get('position') == 'ATK' and not m.get('hasAttacked') and not m.get('isTrapped')
        ]

        if not available_attackers:
            return {'action_type': 'CHANGE_PHASE', 'target_phase': 'MAIN_2'}

        # Elegir el atacante con mayor ATK
        available_attackers.sort(key=lambda x: x[1].get('currentAtk', x[1].get('card_data', {}).get('atk', 0) or 0), reverse=True)
        atk_idx, attacker = available_attackers[0]
        atk_val = attacker.get('currentAtk', attacker.get('card_data', {}).get('atk', 0) or 0)

        # Monstruos rivales en campo
        opp_targets = [(i, m) for i, m in enumerate(opp_monsters) if m is not None]

        if not opp_targets:
            # Ataque directo al jugador rival
            return {
                'action_type': 'DECLARE_ATTACK',
                'attacker_slot': atk_idx,
                'target_slot': 'DIRECT'
            }

        # Estrategia de IA Avanzada (Nv 30+): Atacar primero a monstruos en ATK destruibles o DEF destruibles
        valid_targets = []
        for i, m in opp_targets:
            pos = m.get('position', 'ATK')
            is_face_down = m.get('faceDown', False)
            def_val = m.get('currentDef', m.get('card_data', {}).get('def', 0) or 0)
            target_atk = m.get('currentAtk', m.get('card_data', {}).get('atk', 0) or 0)

            if is_face_down:
                valid_targets.append((i, 100)) # Atacar boca abajo
            elif pos == 'ATK' and atk_val > target_atk:
                diff = atk_val - target_atk
                valid_targets.append((i, diff + 1000)) # Máximo daño de batalla
            elif pos == 'DEF' and atk_val > def_val:
                valid_targets.append((i, 500)) # Destruir defensa

        if valid_targets:
            valid_targets.sort(key=lambda x: x[1], reverse=True)
            chosen_target_slot = valid_targets[0][0]
            return {
                'action_type': 'DECLARE_ATTACK',
                'attacker_slot': atk_idx,
                'target_slot': chosen_target_slot
            }

        # Si ningún ataque es favorable (ej: todos los rivales tienen mayor ATK)
        if self.level >= 30:
            return {'action_type': 'CHANGE_PHASE', 'target_phase': 'MAIN_2'}
        else:
            # IA Novata (Nv 5): Ataca aunque sea desfavorables
            return {
                'action_type': 'DECLARE_ATTACK',
                'attacker_slot': atk_idx,
                'target_slot': opp_targets[0][0]
            }

    def _decide_chain_response(self, state: Dict[str, Any], player_key: str) -> Dict[str, Any]:
        """
        Toma decisiones en la Ventana de Cadenas (LIFO OCG):
        Responde a ataques o activaciones con Trampas/Magias Rápidas como Mirror Force o Spellbinding Circle.
        """
        me = state.get(player_key, {})
        spells = me.get('spells', [])
        pending_action = state.get('pendingAction') or {}

        # Nivel 50 y 100: Reacción táctica instantánea ante ataques enemigos
        if self.level >= 30 and pending_action.get('type') == 'ATTACK':
            # 1. Mirror Force (44095762) - Si hay 1+ monstruos de ataque atacando
            mf_slot = next((i for i, s in enumerate(spells) if s and (s.get('card_id') == 44095762 or (s.get('card_data') and s.get('card_data').get('id') == 44095762))), None)
            if mf_slot is not None:
                return {
                    'action_type': 'RESPOND_CHAIN',
                    'chain_action': 'ACTIVATE_CARD',
                    'slot_index': mf_slot,
                    'card_id': 44095762
                }

            # 2. Spellbinding Circle (18807109) - Encadenar e inmovilizar al atacante
            sc_slot = next((i for i, s in enumerate(spells) if s and (s.get('card_id') in [18807109, 44519536] or (s.get('card_data') and s.get('card_data').get('id') in [18807109, 44519536]))), None)
            if sc_slot is not None:
                attacker_slot = pending_action.get('attackerSlot', 0)
                return {
                    'action_type': 'RESPOND_CHAIN',
                    'chain_action': 'ACTIVATE_CARD',
                    'slot_index': sc_slot,
                    'card_id': 18807109,
                    'target_slot': attacker_slot
                }

        # Pasar prioridad de cadena si no hay respuestas requeridas
        return {
            'action_type': 'RESPOND_CHAIN',
            'chain_action': 'PASS'
        }

if __name__ == '__main__':
    # CLI Mode para ser consumido por subprocesos o scripts
    if len(sys.argv) > 1:
        try:
            raw_input = sys.argv[1]
            data = json.loads(raw_input)
            lvl = data.get('level', 30)
            p_key = data.get('player_key', 'player2')
            agent = OcgAiAgent(level=lvl)
            decision = agent.select_best_action(data.get('state', {}), player_key=p_key)
            print(json.dumps(decision))
        except Exception as e:
            print(json.dumps({'error': str(e), 'action_type': 'PASS_PHASE'}))
    else:
        # Prueba unitaria básica
        agent = OcgAiAgent(level=100)
        print(f"Agente OCG Inicializado: {agent.name} (Nv. {agent.level})")
