"""
Ani-Dimension: Agente IA Profesional de Duelos Yu-Gi-Oh OCG (Python Engine)
Soporta los 50 Niveles de Dificultad (Nv. 1 a Nv. 100).
Toma decisiones estratégicas profesionales: combos, sacrificios, fusiones, rituales,
cadenas LIFO, magias continuas/equipo/campo y trampas de respuesta.
"""

import sys
import json
import math
import random
from typing import Dict, List, Any, Optional, Tuple

# Recetas oficiales de Fusión OCG
FUSION_CATALOG = {
    45231177: [34460851, 44287299], # Flame Swordsman: Flame Manipulator + Masaki
    58528964: [32274490, 40826495], # Flame Ghost: Skull Servant + Dissolverock
    17881964: [53293545, 75356564], # Darkfire Dragon: Firegrass + Petit Dragon
    37421579: [36121917, 96851799], # Charubin the Fire Knight: Monster Egg + Hinotama Soul
    70681994: [15480588, 33064647], # Dragoness the Wicked Knight: Armored Lizard + One-Eyed Shield Dragon
    95952802: [90357090, 43500484], # Flower Wolf: Silver Fang + Darkworld Thorns
    66889139: [6368038, 28279543],  # Gaia the Dragon Champion: Gaia + Curse of Dragon
    1641882:  [38142739, 30451366], # Fusionist: Petit Angel + Mystical Sheep #2
    54541900: [56342351, 92731455], # Karbonala Warrior: M-Warrior #1 + M-Warrior #2
    9293977:  [29172562, 55444629], # Metal Dragon: Steel Ogre Grotto #1 + Lesser Dragon
    23995346: [89631139, 89631139, 89631139], # Blue-Eyes Ultimate Dragon
    11901678: [70781052, 1621203],  # B. Skull Dragon: Summoned Skull + Red-Eyes B. Dragon
    90660762: [99267150, 1621203],  # Meteor B. Dragon: Meteor Dragon + Red-Eyes B. Dragon
    54719828: [31709826, 31709826], # Twin-Headed Thunder Dragon
    63519819: [41420027, 64631466], # Thousand-Eyes Restrict
    74157028: [70095154, 70095154], # Cyber Twin Dragon
    51828629: [45895206, 5628232],  # Giltia the D. Knight
    94905343: [38942059, 30113682], # Rabid Horseman
    89127526: [40814987, 88819587], # Cyber Saurus
    74701381: [83678828, 47922711], # Punished Eagle
    2504891:  [88279736, 13429800], # Skull Knight
    96890582: [39131963, 7670928],  # Dark Balter the Terrible
    49868263: [42035044, 91559748], # Ryu Senshi
    2971090:  [7892346, 50259460],  # Fiend Skull Dragon
    53527835: [78010363, 14851496], # Sanwitch
    85637910: [53724621, 6588580],  # Reaper on the Nightmare
    13722870: [46986414, 45231177], # Dark Flare Knight
    90140980: [1249315, 79335209, 42941114], # Ojama King
    13756293: [78984772, 88472456], # King Dragun
    27134689: [87801965, 22609617], # Master of Oz
    87717231: [81480460, 46970027]  # Gatling Dragon
}

# Recetas oficiales de Magias de Ritual OCG
RITUAL_CATALOG = {
    55761792: {'monster_id': 5405694,  'min_stars': 8, 'name': 'Black Luster Soldier'},
    60365591: {'monster_id': 82301904, 'min_stars': 8, 'name': 'Shinato'},
    41426869: {'monster_id': 64631466, 'min_stars': 1, 'name': 'Relinquished'},
    6920770:  {'monster_id': 97642679, 'min_stars': 8, 'name': 'Dark Master - Zorc'},
    43694075: {'monster_id': 25833572, 'min_stars': 7, 'name': 'Skull Guardian'},
    94377247: {'monster_id': 49064413, 'min_stars': 8, 'name': 'The Masked Beast'},
    43417563: {'monster_id': 4849037,  'min_stars': 6, 'name': 'Performance of Sword'},
    80811661: {'monster_id': 30243662, 'min_stars': 6, 'name': 'Hungry Burger'},
    76806714: {'monster_id': 91782589, 'min_stars': 8, 'name': 'Crab Turtle'},
    39399268: {'monster_id': 40267580, 'min_stars': 7, 'name': 'Chakra'},
    78577570: {'monster_id': 61236371, 'min_stars': 7, 'name': 'Garma Sword'},
    54539105: {'monster_id': 33951077, 'min_stars': 7, 'name': 'Super War-Lion'},
    81933259: {'monster_id': 10202894, 'min_stars': 6, 'name': "Fiend's Mirror"},
    31066283: {'monster_id': 99721536, 'min_stars': 6, 'name': 'Dokurorider'},
    77454922: {'monster_id': 62337484, 'min_stars': 7, 'name': 'Fortress Whale'},
    41182875: {'monster_id': 41190105, 'min_stars': 8, 'name': 'Javelin Beetle'},
    81756897: {'monster_id': 69123138, 'min_stars': 8, 'name': 'Zera The Mant'},
    76792184: {'monster_id': 46411259, 'min_stars': 7, 'name': 'Reshef'}
}

FLIP_EFFECT_IDS = {54652250, 7089711, 9076207, 33066139, 34267821, 38142739, 31764782, 33508719, 73891874}

class OcgAiAgent:
    def __init__(self, level: int = 30):
        self.level = max(1, min(100, level))
        self.name = f"Duelista NPC (Nv. {self.level})" if self.level < 100 else "Yami Yugi - Rey de los Juegos (Nv. 100)"

    def evaluate_board_state(self, state: Dict[str, Any], player_key: str) -> float:
        """
        Función de Evaluación Heurística Táctica OCG:
        Calcula ventaja de LP, ventaja de mano, control de campo, presión de trampas y ventaja de tempo.
        """
        opponent_key = 'player2' if player_key == 'player1' else 'player1'
        me = state.get(player_key, {})
        opp = state.get(opponent_key, {})
        if not me or not opp:
            return 0.0

        lp_diff = (me.get('lp', 8000) - opp.get('lp', 8000)) / 100.0
        hand_diff = (len(me.get('hand', [])) * 20.0) - (len(opp.get('hand', [])) * 18.0)

        my_atk_total = 0
        for m in me.get('monsters', []):
            if m:
                atk = m.get('currentAtk', m.get('card_data', {}).get('atk', 0) or 0)
                pos = m.get('position', 'ATK')
                if pos == 'ATK' and not m.get('isTrapped'):
                    my_atk_total += atk
                else:
                    df = m.get('currentDef', m.get('card_data', {}).get('def', 0) or 0)
                    my_atk_total += (df * 0.6)

        opp_atk_total = 0
        for m in opp.get('monsters', []):
            if m:
                atk = m.get('currentAtk', m.get('card_data', {}).get('atk', 0) or 0)
                pos = m.get('position', 'ATK')
                if pos == 'ATK' and not m.get('isTrapped'):
                    opp_atk_total += atk
                else:
                    df = m.get('currentDef', m.get('card_data', {}).get('def', 0) or 0)
                    opp_atk_total += (df * 0.6)

        field_diff = (my_atk_total - opp_atk_total) / 80.0
        my_st = sum(1 for s in me.get('spells', []) if s is not None)
        opp_st = sum(1 for s in opp.get('spells', []) if s is not None)
        backrow_diff = (my_st * 12.0) - (opp_st * 10.0)

        return round(lp_diff + hand_diff + field_diff + backrow_diff, 2)

    def select_best_action(self, state: Dict[str, Any], player_key: str = 'player2') -> Dict[str, Any]:
        """
        Selecciona la mejor acción reglamentaria oficial OCG según la fase y estado actual.
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
        extra_deck = me.get('extraDeck', [])
        normal_summon_used = state.get('normalSummonUsed', False)
        turn_number = state.get('turnNumber', 1)

        # -------------------------------------------------------------
        # 1. CONTROL DE MESA & VENTAJA DE CARTAS (BOARD BREAKERS)
        # -------------------------------------------------------------
        # A. Limpieza de Magias/Trampas del rival (Harpie's Feather Duster / Heavy Storm / MST / De-Spell)
        opp_has_st = any(s is not None for s in opp.get('spells', [])) or opp.get('fieldSpell') is not None
        if opp_has_st:
            # Harpie's Feather Duster (18144506)
            duster_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 18144506), None)
            if duster_idx is not None:
                return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': duster_idx, 'card_id': 18144506}

            # Heavy Storm (19613556)
            if sum(1 for s in spells if s is not None) <= 1:
                storm_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 19613556), None)
                if storm_idx is not None:
                    return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': storm_idx, 'card_id': 19613556}

            # Mystical Space Typhoon (5318639)
            mst_idx = next((i for i, c in enumerate(hand) if self._get_id(c) in [5318639, 5318639]), None)
            if mst_idx is not None:
                return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': mst_idx, 'card_id': 5318639}

        # B. Robo de cartas (Pot of Greed / Graceful Charity)
        pot_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 55144522), None)
        if pot_idx is not None:
            return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': pot_idx, 'card_id': 55144522}

        charity_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 79571449), None)
        if charity_idx is not None and len(hand) >= 3:
            return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': charity_idx, 'card_id': 79571449}

        # C. Limpieza masiva de monstruos rivales (Raigeki / Dark Hole)
        opp_monsters = [m for m in opp.get('monsters', []) if m is not None]
        my_monsters = [m for m in monsters if m is not None]

        if opp_monsters:
            raigeki_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 12580477), None)
            if raigeki_idx is not None:
                return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': raigeki_idx, 'card_id': 12580477}

            if len(opp_monsters) > len(my_monsters) or (len(opp_monsters) > 0 and len(my_monsters) == 0):
                dh_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 53129443), None)
                if dh_idx is not None:
                    return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': dh_idx, 'card_id': 53129443}

        # D. Control de monstruo rival (Change of Heart / Snatch Steal)
        if opp_monsters and any(m is None for m in monsters):
            coh_idx = next((i for i, c in enumerate(hand) if self._get_id(c) in [4031928, 45986603]), None)
            if coh_idx is not None:
                return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': coh_idx, 'card_id': self._get_id(hand[coh_idx])}

        # E. Resurrección (Monster Reborn / Premature Burial)
        if any(m is None for m in monsters):
            all_gy = (me.get('graveyard', []) or []) + (opp.get('graveyard', []) or [])
            gy_monsters = [c for c in all_gy if c.get('type') and 'Monster' in str(c.get('type'))]
            if gy_monsters:
                mr_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 83764718), None)
                if mr_idx is not None:
                    return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': mr_idx, 'card_id': 83764718}

        # -------------------------------------------------------------
        # 2. INVOCACIONES ESPECIALES: SINCRONÍAS (5D's), FUSIONES & RITUALES
        # -------------------------------------------------------------
        # E1. INVOCACIÓN POR SINCRONÍA (SYNCHRO SUMMON - 5D's)
        synchro_action = self._check_synchro_summon(state, player_key)
        if synchro_action:
            return synchro_action

        # F. Fusión con Polimerización (24094653)
        poly_idx = next((i for i, c in enumerate(hand) if self._get_id(c) == 24094653), None)
        if poly_idx is not None and extra_deck:
            hand_ids = [self._get_id(c) for c in hand]
            field_ids = [self._get_id(m) for m in my_monsters]
            mat_pool = hand_ids + field_ids

            for f_card in extra_deck:
                f_id = self._get_id(f_card)
                recipe = FUSION_CATALOG.get(f_id)
                if recipe:
                    temp_pool = list(mat_pool)
                    can_fuse = True
                    for mat_id in recipe:
                        if mat_id in temp_pool:
                            temp_pool.remove(mat_id)
                        else:
                            can_fuse = False
                            break
                    if can_fuse:
                        return {
                            'action_type': 'ACTIVATE_HAND_SPELL',
                            'hand_index': poly_idx,
                            'card_id': 24094653,
                            'fusion_target_id': f_id
                        }

        # G. Invocación por Ritual
        for i, c in enumerate(hand):
            c_id = self._get_id(c)
            if c_id in RITUAL_CATALOG:
                r_info = RITUAL_CATALOG[c_id]
                has_ritual_mon = any(self._get_id(card) == r_info['monster_id'] for card in hand)
                if has_ritual_mon:
                    total_stars = 0
                    for h_c in hand:
                        if self._get_id(h_c) not in [c_id, r_info['monster_id']]:
                            total_stars += (h_c.get('level') or 0)
                    for f_m in my_monsters:
                        total_stars += (f_m.get('level') or 0)

                    if total_stars >= r_info['min_stars']:
                        return {
                            'action_type': 'ACTIVATE_HAND_SPELL',
                            'hand_index': i,
                            'card_id': c_id,
                            'ritual_monster_id': r_info['monster_id']
                        }

        # -------------------------------------------------------------
        # 3. INVOCACIÓN NORMAL / TRIBUTO / FLIP SET
        # -------------------------------------------------------------
        if not normal_summon_used:
            monsters_in_hand = [(i, c) for i, c in enumerate(hand) if c.get('type') and 'Monster' in str(c.get('type'))]
            occupied_slots = [i for i, m in enumerate(monsters) if m is not None]
            empty_slots = [i for i, m in enumerate(monsters) if m is None]

            # Invocación por 2 Tributos (Nivel 7+)
            if len(occupied_slots) >= 2:
                boss = next((item for item in monsters_in_hand if (item[1].get('level') or 0) >= 7), None)
                if boss:
                    occupied_slots.sort(key=lambda s: monsters[s].get('currentAtk', monsters[s].get('card_data', {}).get('atk', 0) or 0))
                    return {
                        'action_type': 'SUMMON_MONSTER',
                        'hand_index': boss[0],
                        'tribute_slots': occupied_slots[:2],
                        'position': 'ATK'
                    }

            # Invocación por 1 Tributo (Nivel 5-6)
            if len(occupied_slots) >= 1:
                mid_boss = next((item for item in monsters_in_hand if (item[1].get('level') or 0) in [5, 6]), None)
                if mid_boss:
                    occupied_slots.sort(key=lambda s: monsters[s].get('currentAtk', monsters[s].get('card_data', {}).get('atk', 0) or 0))
                    return {
                        'action_type': 'SUMMON_MONSTER',
                        'hand_index': mid_boss[0],
                        'tribute_slots': [occupied_slots[0]],
                        'position': 'ATK'
                    }

            # Invocación Normal sin tributo (Nivel 1 a 4)
            if empty_slots:
                low_monsters = [item for item in monsters_in_hand if (item[1].get('level') or 4) <= 4]
                if low_monsters:
                    low_monsters.sort(key=lambda x: x[1].get('atk', 0) or 0, reverse=True)
                    chosen = low_monsters[0]
                    c_id = self._get_id(chosen[1])
                    atk = chosen[1].get('atk', 0) or 0
                    def_val = chosen[1].get('def', 0) or 0

                    is_flip = c_id in FLIP_EFFECT_IDS or 'Flip' in str(chosen[1].get('type', ''))
                    pos = 'DEF' if (is_flip or (def_val > atk and self.level >= 20)) else 'ATK'

                    return {
                        'action_type': 'SUMMON_MONSTER',
                        'hand_index': chosen[0],
                        'tribute_slots': [],
                        'position': pos
                    }

        # -------------------------------------------------------------
        # 4. EQUIPOS Y MAGIAS DE CAMPO
        # -------------------------------------------------------------
        if my_monsters:
            # Magias de Equipo (Axe of Despair, Mage Power, etc.)
            equip_idx = next((i for i, c in enumerate(hand) if c.get('race') == 'Equip' or 'Equip' in str(c.get('type', ''))), None)
            if equip_idx is not None:
                # Equipar al monstruo con mayor ATK
                best_slot = max(range(5), key=lambda i: monsters[i].get('currentAtk', 0) if monsters[i] else -1)
                return {
                    'action_type': 'ACTIVATE_HAND_SPELL',
                    'hand_index': equip_idx,
                    'card_id': self._get_id(hand[equip_idx]),
                    'target_slot': best_slot
                }

        # Magias de Campo
        if me.get('fieldSpell') is None:
            field_idx = next((i for i, c in enumerate(hand) if c.get('race') == 'Field' or 'Field' in str(c.get('type', ''))), None)
            if field_idx is not None:
                return {'action_type': 'ACTIVATE_HAND_SPELL', 'hand_index': field_idx, 'card_id': self._get_id(hand[field_idx])}

        # -------------------------------------------------------------
        # 5. COLOCAR TRAMPAS Y MAGIAS RÁPIDAS EN RETAGUARDIA (BACKROW)
        # -------------------------------------------------------------
        empty_st_slots = [i for i, s in enumerate(spells) if s is None]
        if empty_st_slots:
            st_idx = next((i for i, c in enumerate(hand) if 'Trap' in str(c.get('type', '')) or c.get('race') == 'Quick-Play' or 'Quick-Play' in str(c.get('type', ''))), None)
            if st_idx is not None:
                return {
                    'action_type': 'SET_SPELL_TRAP',
                    'hand_index': st_idx,
                    'target_slot': empty_st_slots[0]
                }

        # -------------------------------------------------------------
        # 6. TRANSICIÓN A BATTLE PHASE O END PHASE
        # -------------------------------------------------------------
        if turn_number > 1 and any(m is not None and m.get('position') == 'ATK' and not m.get('isTrapped') and not m.get('hasAttacked') for m in monsters):
            return {'action_type': 'CHANGE_PHASE', 'target_phase': 'BATTLE'}

        return {'action_type': 'CHANGE_PHASE', 'target_phase': 'END'}

    def _decide_battle_phase(self, state: Dict[str, Any], player_key: str) -> Dict[str, Any]:
        opponent_key = 'player2' if player_key == 'player1' else 'player1'
        me = state.get(player_key, {})
        opp = state.get(opponent_key, {})
        my_monsters = me.get('monsters', [])
        opp_monsters = opp.get('monsters', [])

        available_attackers = [
            (i, m) for i, m in enumerate(my_monsters)
            if m is not None and m.get('position') == 'ATK' and not m.get('hasAttacked') and not m.get('isTrapped')
        ]

        if not available_attackers:
            return {'action_type': 'CHANGE_PHASE', 'target_phase': 'MAIN_2'}

        # Ordenar atacantes por mayor ATK
        available_attackers.sort(key=lambda x: x[1].get('currentAtk', x[1].get('card_data', {}).get('atk', 0) or 0), reverse=True)
        atk_idx, attacker = available_attackers[0]
        atk_val = attacker.get('currentAtk', attacker.get('card_data', {}).get('atk', 0) or 0)

        opp_targets = [(i, m) for i, m in enumerate(opp_monsters) if m is not None]

        # Campo rival limpio -> Ataque directo letal
        if not opp_targets:
            return {
                'action_type': 'DECLARE_ATTACK',
                'attacker_slot': atk_idx,
                'target_slot': 'DIRECT'
            }

        # Evaluar mejor objetivo de ataque
        favorable_targets = []
        for i, m in opp_targets:
            pos = m.get('position', 'ATK')
            is_face_down = m.get('faceDown', False)
            t_def = m.get('currentDef', m.get('card_data', {}).get('def', 0) or 0)
            t_atk = m.get('currentAtk', m.get('card_data', {}).get('atk', 0) or 0)

            if is_face_down:
                favorable_targets.append((i, 200))
            elif pos == 'ATK' and atk_val > t_atk:
                favorable_targets.append((i, (atk_val - t_atk) + 1000))
            elif pos == 'DEF' and atk_val > t_def:
                favorable_targets.append((i, 500))

        if favorable_targets:
            favorable_targets.sort(key=lambda x: x[1], reverse=True)
            return {
                'action_type': 'DECLARE_ATTACK',
                'attacker_slot': atk_idx,
                'target_slot': favorable_targets[0][0]
            }

        # Si el duelo es de alto nivel y el ataque es suicida, pasar a Main 2
        if self.level >= 30:
            return {'action_type': 'CHANGE_PHASE', 'target_phase': 'MAIN_2'}

        return {
            'action_type': 'DECLARE_ATTACK',
            'attacker_slot': atk_idx,
            'target_slot': opp_targets[0][0]
        }

    def _decide_chain_response(self, state: Dict[str, Any], player_key: str) -> Dict[str, Any]:
        """
        Respuesta en Ventana de Cadenas LIFO (Mirror Force, Magic Cylinder, Waboku, Trap Hole, Seven Tools, MST).
        """
        me = state.get(player_key, {})
        spells = me.get('spells', [])
        pending_action = state.get('pendingAction') or {}
        action_type = pending_action.get('type')

        # Respuesta ante Ataque Rival (BATTLE ATTACK)
        if action_type == 'ATTACK':
            # 1. Mirror Force (44095762)
            mf_idx = next((i for i, s in enumerate(spells) if s and self._get_id(s) == 44095762), None)
            if mf_idx is not None:
                return {'action_type': 'RESPOND_CHAIN', 'chain_action': 'ACTIVATE_CARD', 'slot_index': mf_idx, 'card_id': 44095762}

            # 2. Magic Cylinder (62279055)
            mc_idx = next((i for i, s in enumerate(spells) if s and self._get_id(s) == 62279055), None)
            if mc_idx is not None:
                return {'action_type': 'RESPOND_CHAIN', 'chain_action': 'ACTIVATE_CARD', 'slot_index': mc_idx, 'card_id': 62279055}

            # 3. Waboku (12607053)
            wb_idx = next((i for i, s in enumerate(spells) if s and self._get_id(s) == 12607053), None)
            if wb_idx is not None:
                return {'action_type': 'RESPOND_CHAIN', 'chain_action': 'ACTIVATE_CARD', 'slot_index': wb_idx, 'card_id': 12607053}

            # 4. Spellbinding Circle (18807109)
            sc_idx = next((i for i, s in enumerate(spells) if s and self._get_id(s) in [18807109, 44519536]), None)
            if sc_idx is not None:
                return {
                    'action_type': 'RESPOND_CHAIN',
                    'chain_action': 'ACTIVATE_CARD',
                    'slot_index': sc_idx,
                    'card_id': 18807109,
                    'target_slot': pending_action.get('attackerSlot', 0)
                }

        # Respuesta ante Invocación Rival (SUMMON)
        elif action_type == 'SUMMON':
            th_idx = next((i for i, s in enumerate(spells) if s and self._get_id(s) in [4206964, 29401950]), None)
            if th_idx is not None:
                return {'action_type': 'RESPOND_CHAIN', 'chain_action': 'ACTIVATE_CARD', 'slot_index': th_idx, 'card_id': 4206964}

        # Respuesta ante Magia/Trampa Rival
        elif action_type == 'ACTIVATE_SPELL_TRAP':
            st_counter = next((i for i, s in enumerate(spells) if s and self._get_id(s) in [3819470, 99517131, 41420027]), None)
            if st_counter is not None:
                return {'action_type': 'RESPOND_CHAIN', 'chain_action': 'ACTIVATE_CARD', 'slot_index': st_counter, 'card_id': self._get_id(spells[st_counter])}

        return {'action_type': 'RESPOND_CHAIN', 'chain_action': 'PASS'}

    def _check_synchro_summon(self, state: Dict[str, Any], player_key: str) -> Optional[Dict[str, Any]]:
        """
        Calcula combinaciones oficiales de Invocación por Sincronía (5D's):
        1 Monstruo Cantante (Tuner) + 1 o más Monstruos No Cantantes en campo.
        """
        me = state.get(player_key, {})
        extra_deck = me.get('extraDeck', [])
        monsters = me.get('monsters', [])

        synchros = [c for c in extra_deck if self._is_synchro(c)]
        if not synchros:
            return None

        # Monstruos válidos en el campo
        field_monsters = []
        for i, m in enumerate(monsters):
            if m is not None and not m.get('isTrapped'):
                field_monsters.append({
                    'slot': i,
                    'id': self._get_id(m),
                    'level': self._get_card_level(m),
                    'is_tuner': self._is_tuner(m),
                    'atk': m.get('currentAtk', m.get('card_data', {}).get('atk', 0) or 0)
                })

        tuners = [m for m in field_monsters if m['is_tuner']]
        non_tuners = [m for m in field_monsters if not m['is_tuner']]

        if not tuners or not non_tuners:
            return None

        # Ordenar sincronías por mayor ATK/Nivel
        synchros.sort(key=lambda s: (s.get('card_data', {}).get('atk', 0) or s.get('atk', 0) or 0), reverse=True)

        for s_card in synchros:
            s_id = self._get_id(s_card)
            s_data = s_card.get('card_data', {}) or s_card
            s_level = s_data.get('level') or s_card.get('level') or 0
            if s_level <= 0:
                continue

            for t in tuners:
                # Caso 1: 1 Tuner + 1 No Cantante
                for nt1 in non_tuners:
                    if t['level'] + nt1['level'] == s_level:
                        return {
                            'action_type': 'SYNCHRO_SUMMON',
                            'synchro_card_id': s_id,
                            'material_slots': [t['slot'], nt1['slot']],
                            'position': 'ATTACK'
                        }

                # Caso 2: 1 Tuner + 2 No Cantantes
                for i in range(len(non_tuners)):
                    for j in range(i + 1, len(non_tuners)):
                        nt1 = non_tuners[i]
                        nt2 = non_tuners[j]
                        if t['level'] + nt1['level'] + nt2['level'] == s_level:
                            return {
                                'action_type': 'SYNCHRO_SUMMON',
                                'synchro_card_id': s_id,
                                'material_slots': [t['slot'], nt1['slot'], nt2['slot']],
                                'position': 'ATTACK'
                            }

        return None

    def _is_tuner(self, card_obj: Any) -> bool:
        if not card_obj:
            return False
        cd = card_obj.get('card_data', {}) if isinstance(card_obj, dict) else {}
        type_str = (str(card_obj.get('type', '')) + ' ' + str(cd.get('type', ''))).lower()
        type_code = int(card_obj.get('typeCode') or cd.get('typeCode') or 0)
        return 'tuner' in type_str or 'cantante' in type_str or bool(type_code & 0x1000)

    def _is_synchro(self, card_obj: Any) -> bool:
        if not card_obj:
            return False
        cd = card_obj.get('card_data', {}) if isinstance(card_obj, dict) else {}
        type_str = (str(card_obj.get('type', '')) + ' ' + str(cd.get('type', ''))).lower()
        type_code = int(card_obj.get('typeCode') or cd.get('typeCode') or 0)
        return 'synchro' in type_str or 'sincron' in type_str or bool(type_code & 0x2000)

    def _get_card_level(self, card_obj: Any) -> int:
        if not card_obj:
            return 0
        cd = card_obj.get('card_data', {}) if isinstance(card_obj, dict) else {}
        return int(card_obj.get('level') or cd.get('level') or 4)

    def _get_id(self, card_obj: Any) -> int:
        if not card_obj:
            return 0
        if isinstance(card_obj, int):
            return card_obj
        if isinstance(card_obj, dict):
            return int(card_obj.get('id') or card_obj.get('card_id') or card_obj.get('card_data', {}).get('id') or 0)
        return 0

if __name__ == '__main__':
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
        agent = OcgAiAgent(level=100)
        print(f"Agente OCG Inicializado: {agent.name} (Nv. {agent.level})")
