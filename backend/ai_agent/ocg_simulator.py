"""
Ani-Dimension: Simulador de Duelos OCG y Motor de Pruebas Automatizadas
Simula duelos completos punto a punto entre agentes de IA para verificar
las reglas oficial Konami OCG, validar efectos de cartas y corregir inconsistencias.
"""

import random
from typing import Dict, List, Any, Tuple
from ocg_ai import OcgAiAgent

CARDS_DATABASE = {
    89631139: {"id": 89631139, "name": "Blue-Eyes White Dragon", "type": "Normal Monster", "level": 8, "atk": 3000, "def": 2500, "race": "Dragon", "attribute": "LIGHT"},
    46986414: {"id": 46986414, "name": "Dark Magician", "type": "Normal Monster", "level": 7, "atk": 2500, "def": 2100, "race": "Spellcaster", "attribute": "DARK"},
    70781052: {"id": 70781052, "name": "Summoned Skull", "type": "Normal Monster", "level": 6, "atk": 2500, "def": 1200, "race": "Fiend", "attribute": "DARK"},
    74677422: {"id": 74677422, "name": "Red-Eyes Black Dragon", "type": "Normal Monster", "level": 7, "atk": 2400, "def": 2000, "race": "Dragon", "attribute": "DARK"},
    91152256: {"id": 91152256, "name": "Celtic Guardian", "type": "Normal Monster", "level": 4, "atk": 1400, "def": 1200, "race": "Warrior", "attribute": "EARTH"},
    78193831: {"id": 78193831, "name": "Curse of Dragon", "type": "Normal Monster", "level": 5, "atk": 2000, "def": 1500, "race": "Dragon", "attribute": "DARK"},
    40640057: {"id": 40640057, "name": "Winged Dragon Guardian #1", "type": "Normal Monster", "level": 4, "atk": 1400, "def": 1200, "race": "Dragon", "attribute": "WIND"},
    71625222: {"id": 71625222, "name": "Time Wizard", "type": "Effect Monster", "level": 2, "atk": 500, "def": 400, "race": "Spellcaster", "attribute": "LIGHT"},
    11091375: {"id": 11091375, "name": "Giant Soldier of Stone", "type": "Normal Monster", "level": 3, "atk": 1300, "def": 2000, "race": "Rock", "attribute": "EARTH"},
    7084129:  {"id": 7084129,  "name": "Mystical Elf", "type": "Normal Monster", "level": 4, "atk": 800, "def": 2000, "race": "Spellcaster", "attribute": "LIGHT"},
    18807109: {"id": 18807109, "name": "Spellbinding Circle", "type": "Continuous Trap", "race": "Trap", "attribute": "TRAP"},
    44095762: {"id": 44095762, "name": "Mirror Force", "type": "Normal Trap", "race": "Trap", "attribute": "TRAP"},
    83764718: {"id": 83764718, "name": "Monster Reborn", "type": "Normal Spell", "race": "Spell", "attribute": "SPELL"},
    12580477: {"id": 12580477, "name": "Raigeki", "type": "Normal Spell", "race": "Spell", "attribute": "SPELL"},
    55144522: {"id": 55144522, "name": "Pot of Greed", "type": "Normal Spell", "race": "Spell", "attribute": "SPELL"},
    53129443: {"id": 53129443, "name": "Dark Hole", "type": "Normal Spell", "race": "Spell", "attribute": "SPELL"},
    5318639:  {"id": 5318639,  "name": "Mystical Space Typhoon", "type": "Quick-Play Spell", "race": "Spell", "attribute": "SPELL"},
    59197169: {"id": 59197169, "name": "Yami", "type": "Field Spell", "race": "Spell", "attribute": "SPELL"}
}

def create_sample_deck(owner_key: str) -> List[Dict[str, Any]]:
    pool = list(CARDS_DATABASE.keys())
    deck = []
    for i in range(40):
        c_id = pool[i % len(pool)]
        card_copy = dict(CARDS_DATABASE[c_id])
        card_copy['originalOwner'] = owner_key
        deck.append(card_copy)
    random.shuffle(deck)
    return deck

class OcgDuelSimulator:
    def __init__(self, p1_level: int = 30, p2_level: int = 30):
        self.p1_agent = OcgAiAgent(level=p1_level)
        self.p2_agent = OcgAiAgent(level=p2_level)

        self.state = {
            'roomId': 'SIM_ROOM',
            'phase': 'MAIN_1',
            'turnNumber': 1,
            'turnPlayer': 'Player 1',
            'firstPlayer': 'player1',
            'normalSummonUsed': False,
            'activeChain': [],
            'chainWindowActive': False,
            'pendingAction': None,
            'logs': [],
            'player1': {
                'username': f'Player 1 (Nv. {p1_level})',
                'lp': 8000,
                'deck': create_sample_deck('player1'),
                'hand': [],
                'monsters': [None] * 5,
                'spells': [None] * 5,
                'fieldSpell': None,
                'graveyard': [],
                'banished': []
            },
            'player2': {
                'username': f'Yugi Muto (Nv. {p2_level})',
                'lp': 8000,
                'deck': create_sample_deck('player2'),
                'hand': [],
                'monsters': [None] * 5,
                'spells': [None] * 5,
                'fieldSpell': None,
                'graveyard': [],
                'banished': []
            }
        }

        # Robar manos iniciales (5 cartas)
        for _ in range(5):
            self.state['player1']['hand'].append(self.state['player1']['deck'].pop())
            self.state['player2']['hand'].append(self.state['player2']['deck'].pop())

    def run_duel(self, max_turns: int = 40) -> Dict[str, Any]:
        """
        Ejecuta la simulación completa de un duelo OCG punto a punto.
        Retorna estadísticas de duración, ganador, cartas activadas y errores.
        """
        cards_activated = set()
        errors_logged = []

        while self.state['turnNumber'] <= max_turns:
            # Comprobar estado de victoria
            if self.state['player1']['lp'] <= 0 or self.state['player2']['lp'] <= 0:
                break
            if len(self.state['player1']['deck']) == 0 or len(self.state['player2']['deck']) == 0:
                break

            current_key = 'player1' if self.state['turnPlayer'] == self.state['player1']['username'] else 'player2'
            agent = self.p1_agent if current_key == 'player1' else self.p2_agent

            # 1. DRAW PHASE
            self.state['phase'] = 'DRAW'
            me = self.state[current_key]
            if len(me['deck']) > 0:
                me['hand'].append(me['deck'].pop())

            # 2. MAIN PHASE 1
            self.state['phase'] = 'MAIN_1'
            self.state['normalSummonUsed'] = False
            self._execute_phase_actions(agent, current_key, cards_activated, errors_logged)

            if self.state['player1']['lp'] <= 0 or self.state['player2']['lp'] <= 0:
                break

            # 3. BATTLE PHASE (Turno > 1)
            if self.state['turnNumber'] > 1:
                self.state['phase'] = 'BATTLE'
                self._execute_phase_actions(agent, current_key, cards_activated, errors_logged)

            if self.state['player1']['lp'] <= 0 or self.state['player2']['lp'] <= 0:
                break

            # 4. END PHASE & CAMBIO DE TURNO
            self.state['phase'] = 'END'
            self.state['turnNumber'] += 1
            self.state['turnPlayer'] = self.state['player2']['username'] if current_key == 'player1' else self.state['player1']['username']

        # Determinar Ganador
        p1_lp = self.state['player1']['lp']
        p2_lp = self.state['player2']['lp']

        winner = 'player1' if p1_lp > p2_lp else ('player2' if p2_lp > p1_lp else 'DRAW')

        return {
            'turns': self.state['turnNumber'],
            'winner': winner,
            'p1_lp': max(0, p1_lp),
            'p2_lp': max(0, p2_lp),
            'cards_activated': list(cards_activated),
            'errors': errors_logged
        }

    def _execute_phase_actions(self, agent: OcgAiAgent, player_key: str, cards_activated: set, errors_logged: list):
        opponent_key = 'player2' if player_key == 'player1' else 'player1'
        me = self.state[player_key]
        opp = self.state[opponent_key]

        actions_count = 0
        while actions_count < 10:
            actions_count += 1
            action = agent.select_best_action(self.state, player_key=player_key)
            a_type = action.get('action_type')

            if a_type == 'CHANGE_PHASE':
                self.state['phase'] = action.get('target_phase', 'END')
                if self.state['phase'] in ['END', 'MAIN_2']:
                    break

            elif a_type == 'ACTIVATE_HAND_SPELL':
                idx = action.get('hand_index')
                c_id = action.get('card_id')
                if idx is not None and idx < len(me['hand']):
                    card = me['hand'].pop(idx)
                    cards_activated.add(card['name'])
                    self._resolve_spell_effect(card, player_key, opponent_key)

            elif a_type == 'SUMMON_MONSTER':
                idx = action.get('hand_index')
                pos = action.get('position', 'ATK')
                tributes = action.get('tribute_slots', [])
                if idx is not None and idx < len(me['hand']):
                    # Eliminar sacrificios
                    for slot in tributes:
                        if slot < 5 and me['monsters'][slot] is not None:
                            me['graveyard'].append(me['monsters'][slot]['card_data'])
                            me['monsters'][slot] = None

                    free_slot = next((i for i, m in enumerate(me['monsters']) if m is None), None)
                    if free_slot is not None:
                        card = me['hand'].pop(idx)
                        cards_activated.add(card['name'])
                        me['monsters'][free_slot] = {
                            'card_id': card['id'],
                            'position': pos,
                            'faceDown': (pos == 'DEF'),
                            'currentAtk': card.get('atk', 0),
                            'currentDef': card.get('def', 0),
                            'hasAttacked': False,
                            'isTrapped': False,
                            'card_data': card
                        }
                        self.state['normalSummonUsed'] = True

            elif a_type == 'SET_SPELL_TRAP':
                idx = action.get('hand_index')
                slot = action.get('target_slot', 0)
                if idx is not None and idx < len(me['hand']) and slot < 5 and me['spells'][slot] is None:
                    card = me['hand'].pop(idx)
                    cards_activated.add(card['name'])
                    me['spells'][slot] = {
                        'card_id': card['id'],
                        'position': 'SET',
                        'faceDown': True,
                        'card_data': card
                    }

            elif a_type == 'DECLARE_ATTACK':
                atk_slot = action.get('attacker_slot', 0)
                target_slot = action.get('target_slot')

                attacker = me['monsters'][atk_slot] if atk_slot < 5 else None
                if attacker:
                    attacker['hasAttacked'] = True
                    atk_val = attacker.get('currentAtk', 0)

                    # --- COMPROBAR RESPUESTA DE TRAMPA DEL RIVAL EN CADENA (LIFO) ---
                    opp_agent = self.p2_agent if player_key == 'player1' else self.p1_agent
                    self.state['pendingAction'] = {'type': 'ATTACK', 'attackerSlot': atk_slot}
                    chain_resp = opp_agent._decide_chain_response(self.state, opponent_key)

                    if chain_resp.get('action_type') == 'RESPOND_CHAIN' and chain_resp.get('chain_action') == 'ACTIVATE_CARD':
                        c_id = chain_resp.get('card_id')
                        s_slot = chain_resp.get('slot_index', 0)
                        if opp['spells'][s_slot] is not None:
                            cards_activated.add(opp['spells'][s_slot]['card_data']['name'])
                            opp['spells'][s_slot] = None

                            if c_id == 44095762: # Mirror Force
                                # Destruir todos los monstruos en ATK
                                for i in range(5):
                                    if me['monsters'][i] and me['monsters'][i]['position'] == 'ATK':
                                        me['graveyard'].append(me['monsters'][i]['card_data'])
                                        me['monsters'][i] = None
                                break # Ataque cancelado
                            elif c_id == 18807109: # Spellbinding Circle
                                attacker['isTrapped'] = True
                                break # Ataque cancelado

                    # Resolución de Combate Normal
                    if target_slot == 'DIRECT':
                        opp['lp'] = max(0, opp['lp'] - atk_val)
                    elif isinstance(target_slot, int) and target_slot < 5 and opp['monsters'][target_slot]:
                        defender = opp['monsters'][target_slot]
                        def_pos = defender.get('position', 'ATK')
                        def_val = defender.get('currentAtk', 0) if def_pos == 'ATK' else defender.get('currentDef', 0)

                        if def_pos == 'ATK':
                            if atk_val > def_val:
                                damage = atk_val - def_val
                                opp['lp'] = max(0, opp['lp'] - damage)
                                opp['graveyard'].append(defender['card_data'])
                                opp['monsters'][target_slot] = None
                            elif def_val > atk_val:
                                damage = def_val - atk_val
                                me['lp'] = max(0, me['lp'] - damage)
                                me['graveyard'].append(attacker['card_data'])
                                me['monsters'][atk_slot] = None
                            else:
                                opp['graveyard'].append(defender['card_data'])
                                me['graveyard'].append(attacker['card_data'])
                                opp['monsters'][target_slot] = None
                                me['monsters'][atk_slot] = None
                        else: # DEF
                            if atk_val > def_val:
                                opp['graveyard'].append(defender['card_data'])
                                opp['monsters'][target_slot] = None
                            elif def_val > atk_val:
                                damage = def_val - atk_val
                                me['lp'] = max(0, me['lp'] - damage)

            elif a_type == 'PASS_PHASE':
                break

    def _resolve_spell_effect(self, card: Dict[str, Any], player_key: str, opponent_key: str):
        me = self.state[player_key]
        opp = self.state[opponent_key]
        c_id = card['id']

        if c_id == 55144522: # Pot of Greed
            for _ in range(2):
                if me['deck']: me['hand'].append(me['deck'].pop())
        elif c_id == 12580477: # Raigeki
            for i in range(5):
                if opp['monsters'][i]:
                    opp['graveyard'].append(opp['monsters'][i]['card_data'])
                    opp['monsters'][i] = None
        elif c_id == 53129443: # Dark Hole
            for i in range(5):
                if me['monsters'][i]:
                    me['graveyard'].append(me['monsters'][i]['card_data'])
                    me['monsters'][i] = None
                if opp['monsters'][i]:
                    opp['graveyard'].append(opp['monsters'][i]['card_data'])
                    opp['monsters'][i] = None
        elif c_id == 83764718: # Monster Reborn
            all_gy = me['graveyard'] + opp['graveyard']
            monsters_in_gy = [c for c in all_gy if c.get('type') and 'Monster' in c.get('type')]
            if monsters_in_gy:
                target = monsters_in_gy[0]
                free_slot = next((i for i, m in enumerate(me['monsters']) if m is None), None)
                if free_slot is not None:
                    me['monsters'][free_slot] = {
                        'card_id': target['id'],
                        'position': 'ATK',
                        'faceDown': False,
                        'currentAtk': target.get('atk', 0),
                        'currentDef': target.get('def', 0),
                        'hasAttacked': False,
                        'isTrapped': False,
                        'card_data': target
                    }
        elif c_id == 5318639: # MST
            free_st = next((i for i, s in enumerate(opp['spells']) if s is not None), None)
            if free_st is not None:
                opp['graveyard'].append(opp['spells'][free_st]['card_data'])
                opp['spells'][free_st] = None
        elif c_id == 59197169: # Yami
            me['fieldSpell'] = card
