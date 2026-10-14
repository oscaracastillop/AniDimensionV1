"""
Ani-Dimension: Simulador de Duelos OCG de Alto Rendimiento y Motor de Pruebas Masivas
Simula duelos reglamentarios completos punto a punto entre agentes de IA
utilizando la base oficial de cartas Konami OCG (cards.cdb / 11 expansiones).
"""

import os
import sqlite3
import random
from typing import Dict, List, Any, Tuple, Optional
from ocg_ai import OcgAiAgent, FUSION_CATALOG, RITUAL_CATALOG, FLIP_EFFECT_IDS

CDB_PATH = os.path.join(os.path.dirname(__file__), '..', 'ocgcore', 'cdb', 'cards.cdb')

def load_cdb_cards() -> Dict[int, Dict[str, Any]]:
    cards_map = {}
    if os.path.exists(CDB_PATH):
        try:
            conn = sqlite3.connect(CDB_PATH)
            cur = conn.cursor()
            cur.execute("""
                SELECT d.id, d.type, d.atk, d.def, d.level, d.race, d.attribute, t.name, t.desc
                FROM datas d
                JOIN texts t ON d.id = t.id
            """)
            for row in cur.fetchall():
                c_id, type_code, atk, def_val, level, race_code, attr_code, name, desc = row
                
                type_str = 'Normal Monster'
                if type_code & 0x2:
                    type_str = 'Spell Card'
                elif type_code & 0x4:
                    type_str = 'Trap Card'
                elif type_code & 0x40:
                    type_str = 'Fusion Monster'
                elif type_code & 0x80:
                    type_str = 'Ritual Monster'
                elif type_code & 0x20:
                    type_str = 'Effect Monster'

                race_str = 'Spell' if (type_code & 0x2) else ('Trap' if (type_code & 0x4) else 'Warrior')
                if (type_code & 0x10000): # Quick-play
                    race_str = 'Quick-Play'
                elif (type_code & 0x40000): # Equip
                    race_str = 'Equip'
                elif (type_code & 0x80000): # Field
                    race_str = 'Field'
                elif (type_code & 0x80): # Ritual Spell
                    race_str = 'Ritual'

                cards_map[c_id] = {
                    'id': c_id,
                    'name': name,
                    'type': type_str,
                    'atk': max(0, atk),
                    'def': max(0, def_val),
                    'level': level,
                    'race': race_str,
                    'attribute': 'SPELL' if (type_code & 0x2) else ('TRAP' if (type_code & 0x4) else 'DARK'),
                    'desc': desc
                }
            conn.close()
        except Exception as e:
            print(f"[SIMULATOR WARNING] Error reading CDB: {e}")
    return cards_map

MASTER_CARDS_DB = load_cdb_cards()

def generate_balanced_ocg_deck(level: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Genera una baraja OCG reglamentaria de 40 cartas + Extra Deck según el nivel del NPC.
    """
    # Cartas básicas de soporte
    power_spells = [55144522, 12580477, 53129443, 83764718, 5318639, 18144506, 79571449, 24094653]
    power_traps = [44095762, 62279055, 12607053, 4206964, 18807109]
    boss_monsters = [89631139, 46986414, 70781052, 74677422, 5405694, 82301904]
    low_monsters = [91152256, 11091375, 7084129, 40640057, 54652250, 7089711, 34460851, 44287299]

    deck = []
    # 20 Monstruos
    for _ in range(14):
        cid = random.choice(low_monsters)
        c_data = MASTER_CARDS_DB.get(cid, {'id': cid, 'name': 'Monstruo Nv4', 'type': 'Normal Monster', 'level': 4, 'atk': 1500, 'def': 1200})
        deck.append(dict(c_data))
    for _ in range(6):
        cid = random.choice(boss_monsters)
        c_data = MASTER_CARDS_DB.get(cid, {'id': cid, 'name': 'Monstruo Boss', 'type': 'Normal Monster', 'level': 7, 'atk': 2500, 'def': 2000})
        deck.append(dict(c_data))

    # 12 Magias
    for _ in range(12):
        cid = random.choice(power_spells)
        c_data = MASTER_CARDS_DB.get(cid, {'id': cid, 'name': 'Magia', 'type': 'Spell Card', 'race': 'Spell'})
        deck.append(dict(c_data))

    # 8 Trampas
    for _ in range(8):
        cid = random.choice(power_traps)
        c_data = MASTER_CARDS_DB.get(cid, {'id': cid, 'name': 'Trampa', 'type': 'Trap Card', 'race': 'Trap'})
        deck.append(dict(c_data))

    random.shuffle(deck)

    # Extra Deck
    extra = []
    fusions = [23995346, 11901678, 45231177, 66889139, 63519819]
    for fid in fusions:
        f_data = MASTER_CARDS_DB.get(fid, {'id': fid, 'name': 'Fusion Boss', 'type': 'Fusion Monster', 'level': 8, 'atk': 2800, 'def': 2000})
        extra.append(dict(f_data))

    return deck[:40], extra

class OcgDuelSimulator:
    def __init__(self, p1_level: int = 50, p2_level: int = 50):
        self.p1_agent = OcgAiAgent(level=p1_level)
        self.p2_agent = OcgAiAgent(level=p2_level)

        p1_deck, p1_extra = generate_balanced_ocg_deck(p1_level)
        p2_deck, p2_extra = generate_balanced_ocg_deck(p2_level)

        self.state = {
            'phase': 'MAIN_1',
            'turnNumber': 1,
            'turnPlayer': 'player1',
            'normalSummonUsed': False,
            'activeChain': [],
            'chainWindowActive': False,
            'pendingAction': None,
            'player1': {
                'username': f'Duelista 1 (Nv. {p1_level})',
                'lp': 8000,
                'deck': p1_deck,
                'extraDeck': p1_extra,
                'hand': [],
                'monsters': [None] * 5,
                'spells': [None] * 5,
                'fieldSpell': None,
                'graveyard': [],
                'banished': []
            },
            'player2': {
                'username': f'NPC OCG (Nv. {p2_level})',
                'lp': 8000,
                'deck': p2_deck,
                'extraDeck': p2_extra,
                'hand': [],
                'monsters': [None] * 5,
                'spells': [None] * 5,
                'fieldSpell': None,
                'graveyard': [],
                'banished': []
            }
        }

        # Robar manos iniciales (5 cartas c/u)
        for _ in range(5):
            if self.state['player1']['deck']:
                self.state['player1']['hand'].append(self.state['player1']['deck'].pop())
            if self.state['player2']['deck']:
                self.state['player2']['hand'].append(self.state['player2']['deck'].pop())

    def run_duel(self, max_turns: int = 35) -> Dict[str, Any]:
        cards_activated = set()
        errors = []

        while self.state['turnNumber'] <= max_turns:
            p1 = self.state['player1']
            p2 = self.state['player2']

            if p1['lp'] <= 0 or p2['lp'] <= 0:
                break
            if len(p1['deck']) == 0 or len(p2['deck']) == 0:
                break

            current_key = self.state['turnPlayer']
            rival_key = 'player2' if current_key == 'player1' else 'player1'
            acting_agent = self.p1_agent if current_key == 'player1' else self.p2_agent
            rival_agent = self.p2_agent if current_key == 'player1' else self.p1_agent

            # 1. DRAW PHASE (excepto turno 1 primer jugador)
            if self.state['turnNumber'] > 1 or current_key != 'player1':
                if self.state[current_key]['deck']:
                    self.state[current_key]['hand'].append(self.state[current_key]['deck'].pop())

            self.state['normalSummonUsed'] = False
            for m in self.state[current_key]['monsters']:
                if m:
                    m['hasAttacked'] = False
                    m['hasChangedPosition'] = False

            # 2. MAIN PHASE 1
            self.state['phase'] = 'MAIN_1'
            self._execute_phase_loop(current_key, acting_agent, rival_key, rival_agent, cards_activated, errors)

            if p1['lp'] <= 0 or p2['lp'] <= 0:
                break

            # 3. BATTLE PHASE
            if self.state['turnNumber'] > 1:
                self.state['phase'] = 'BATTLE'
                self._execute_battle_phase(current_key, acting_agent, rival_key, rival_agent, cards_activated, errors)

            if p1['lp'] <= 0 or p2['lp'] <= 0:
                break

            # 4. MAIN PHASE 2
            self.state['phase'] = 'MAIN_2'
            self._execute_phase_loop(current_key, acting_agent, rival_key, rival_agent, cards_activated, errors)

            # 5. END PHASE -> Cambiar turno
            self.state['turnNumber'] += 1
            self.state['turnPlayer'] = rival_key

        winner = 'draw'
        if self.state['player1']['lp'] > 0 and self.state['player2']['lp'] <= 0:
            winner = 'player1'
        elif self.state['player2']['lp'] > 0 and self.state['player1']['lp'] <= 0:
            winner = 'player2'
        elif len(self.state['player1']['deck']) == 0:
            winner = 'player2'
        elif len(self.state['player2']['deck']) == 0:
            winner = 'player1'
        elif self.state['player1']['lp'] > self.state['player2']['lp']:
            winner = 'player1'
        elif self.state['player2']['lp'] > self.state['player1']['lp']:
            winner = 'player2'

        return {
            'winner': winner,
            'turns': self.state['turnNumber'],
            'p1_lp': max(0, self.state['player1']['lp']),
            'p2_lp': max(0, self.state['player2']['lp']),
            'cards_activated': list(cards_activated),
            'errors': errors
        }

    def _execute_phase_loop(self, current_key, acting_agent, rival_key, rival_agent, cards_act, errors):
        max_actions = 12
        action_count = 0
        while action_count < max_actions:
            action_count += 1
            decision = acting_agent.select_best_action(self.state, player_key=current_key)
            a_type = decision.get('action_type')

            if not a_type or a_type in ['PASS_PHASE', 'CHANGE_PHASE']:
                break

            me = self.state[current_key]
            opp = self.state[rival_key]

            if a_type == 'ACTIVATE_HAND_SPELL':
                h_idx = decision.get('hand_index')
                c_id = decision.get('card_id')
                if h_idx is not None and h_idx < len(me['hand']):
                    card = me['hand'].pop(h_idx)
                    cards_act.add(card.get('id', c_id))

                    # Ejecución del efecto
                    if c_id == 55144522: # Pot of Greed
                        for _ in range(2):
                            if me['deck']: me['hand'].append(me['deck'].pop())
                    elif c_id == 12580477: # Raigeki
                        for i in range(5):
                            if opp['monsters'][i]:
                                opp['graveyard'].append(opp['monsters'][i])
                                opp['monsters'][i] = None
                    elif c_id == 53129443: # Dark Hole
                        for i in range(5):
                            if me['monsters'][i]:
                                me['graveyard'].append(me['monsters'][i])
                                me['monsters'][i] = None
                            if opp['monsters'][i]:
                                opp['graveyard'].append(opp['monsters'][i])
                                opp['monsters'][i] = None
                    elif c_id == 83764718: # Monster Reborn
                        free_slot = next((i for i, m in enumerate(me['monsters']) if m is None), None)
                        if free_slot is not None:
                            all_gy = me['graveyard'] + opp['graveyard']
                            gy_monsters = [c for c in all_gy if 'Monster' in str(c.get('type', ''))]
                            if gy_monsters:
                                best_gy = max(gy_monsters, key=lambda c: c.get('atk', 0))
                                me['monsters'][free_slot] = {
                                    'card_id': best_gy.get('id'),
                                    'card_data': best_gy,
                                    'position': 'ATK',
                                    'currentAtk': best_gy.get('atk', 0),
                                    'currentDef': best_gy.get('def', 0),
                                    'faceDown': False
                                }
                    elif c_id == 24094653: # Polymerization
                        f_id = decision.get('fusion_target_id', 23995346)
                        free_slot = next((i for i, m in enumerate(me['monsters']) if m is None), None)
                        if free_slot is not None:
                            f_data = MASTER_CARDS_DB.get(f_id, {'id': f_id, 'name': 'Fusion Monster', 'atk': 3000, 'def': 2500})
                            me['monsters'][free_slot] = {
                                'card_id': f_id,
                                'card_data': f_data,
                                'position': 'ATK',
                                'currentAtk': f_data.get('atk', 3000),
                                'currentDef': f_data.get('def', 2500),
                                'faceDown': False
                            }
                    elif c_id in RITUAL_CATALOG: # Ritual
                        r_info = RITUAL_CATALOG[c_id]
                        r_mon_id = r_info['monster_id']
                        r_mon_data = MASTER_CARDS_DB.get(r_mon_id, {'id': r_mon_id, 'name': r_info['name'], 'atk': 2800, 'def': 2500})
                        free_slot = next((i for i, m in enumerate(me['monsters']) if m is None), None)
                        if free_slot is not None:
                            me['monsters'][free_slot] = {
                                'card_id': r_mon_id,
                                'card_data': r_mon_data,
                                'position': 'ATK',
                                'currentAtk': r_mon_data.get('atk', 2800),
                                'currentDef': r_mon_data.get('def', 2500),
                                'faceDown': False
                            }
                    me['graveyard'].append(card)

            elif a_type == 'SUMMON_MONSTER':
                h_idx = decision.get('hand_index')
                t_slots = decision.get('tribute_slots', [])
                pos = decision.get('position', 'ATK')
                if h_idx is not None and h_idx < len(me['hand']):
                    for ts in t_slots:
                        if ts < 5 and me['monsters'][ts]:
                            me['graveyard'].append(me['monsters'][ts])
                            me['monsters'][ts] = None

                    free_slot = next((i for i, m in enumerate(me['monsters']) if m is None), None)
                    if free_slot is not None:
                        card = me['hand'].pop(h_idx)
                        cards_act.add(card.get('id', 0))
                        me['monsters'][free_slot] = {
                            'card_id': card.get('id'),
                            'card_data': card,
                            'position': pos,
                            'currentAtk': card.get('atk', 0),
                            'currentDef': card.get('def', 0),
                            'faceDown': (pos == 'DEF')
                        }
                        self.state['normalSummonUsed'] = True

            elif a_type == 'SET_SPELL_TRAP':
                h_idx = decision.get('hand_index')
                t_slot = decision.get('target_slot')
                if h_idx is not None and h_idx < len(me['hand']) and t_slot is not None and t_slot < 5:
                    if me['spells'][t_slot] is None:
                        card = me['hand'].pop(h_idx)
                        me['spells'][t_slot] = {
                            'card_id': card.get('id'),
                            'card_data': card,
                            'position': 'SET',
                            'faceDown': True
                        }

    def _execute_battle_phase(self, current_key, acting_agent, rival_key, rival_agent, cards_act, errors):
        me = self.state[current_key]
        opp = self.state[rival_key]

        while True:
            decision = acting_agent.select_best_action(self.state, player_key=current_key)
            if decision.get('action_type') != 'DECLARE_ATTACK':
                break

            atk_slot = decision.get('attacker_slot')
            target_slot = decision.get('target_slot')

            if atk_slot is None or atk_slot >= 5 or not me['monsters'][atk_slot]:
                break
            attacker = me['monsters'][atk_slot]
            if attacker.get('hasAttacked'):
                break
            attacker['hasAttacked'] = True

            # Comprobar respuestas de cadena del rival (Mirror Force, Magic Cylinder, Waboku)
            self.state['pendingAction'] = {'type': 'ATTACK', 'attackerSlot': atk_slot}
            self.state['chainWindowActive'] = True
            chain_resp = rival_agent.select_best_action(self.state, player_key=rival_key)
            self.state['chainWindowActive'] = False
            self.state['pendingAction'] = None

            if chain_resp.get('action_type') == 'RESPOND_CHAIN' and chain_resp.get('chain_action') == 'ACTIVATE_CARD':
                c_id = chain_resp.get('card_id')
                s_idx = chain_resp.get('slot_index')
                if s_idx is not None and s_idx < 5 and opp['spells'][s_idx]:
                    trap_card = opp['spells'][s_idx]
                    opp['spells'][s_idx] = None
                    opp['graveyard'].append(trap_card)
                    cards_act.add(c_id)

                    if c_id == 44095762: # Mirror Force
                        for i in range(5):
                            if me['monsters'][i] and me['monsters'][i].get('position') == 'ATK':
                                me['graveyard'].append(me['monsters'][i])
                                me['monsters'][i] = None
                        break
                    elif c_id == 62279055: # Magic Cylinder
                        atk_val = attacker.get('currentAtk', 0)
                        me['lp'] -= atk_val
                        continue
                    elif c_id == 12607053: # Waboku
                        continue

            # Ejecución del Ataque
            atk_power = attacker.get('currentAtk', attacker.get('card_data', {}).get('atk', 0) or 0)

            if target_slot == 'DIRECT':
                opp['lp'] -= atk_power
            elif isinstance(target_slot, int) and target_slot < 5 and opp['monsters'][target_slot]:
                defender = opp['monsters'][target_slot]
                def_pos = defender.get('position', 'ATK')
                def_atk = defender.get('currentAtk', defender.get('card_data', {}).get('atk', 0) or 0)
                def_def = defender.get('currentDef', defender.get('card_data', {}).get('def', 0) or 0)

                if def_pos == 'ATK':
                    if atk_power > def_atk:
                        diff = atk_power - def_atk
                        opp['lp'] -= diff
                        opp['graveyard'].append(defender)
                        opp['monsters'][target_slot] = None
                    elif atk_power < def_atk:
                        diff = def_atk - atk_power
                        me['lp'] -= diff
                        me['graveyard'].append(attacker)
                        me['monsters'][atk_slot] = None
                    else:
                        opp['graveyard'].append(defender)
                        opp['monsters'][target_slot] = None
                        me['graveyard'].append(attacker)
                        me['monsters'][atk_slot] = None
                else:
                    # Posición de Defensa
                    defender['faceDown'] = False
                    if atk_power > def_def:
                        opp['graveyard'].append(defender)
                        opp['monsters'][target_slot] = None
                    elif atk_power < def_def:
                        diff = def_def - atk_power
                        me['lp'] -= diff

            if me['lp'] <= 0 or opp['lp'] <= 0:
                break

if __name__ == '__main__':
    sim = OcgDuelSimulator(p1_level=50, p2_level=50)
    res = sim.run_duel(max_turns=30)
    print(f"Duelo de prueba completado: Ganador {res['winner']} en {res['turns']} turnos. (P1 LP: {res['p1_lp']} | P2 LP: {res['p2_lp']})")
