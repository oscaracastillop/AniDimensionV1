"""
Ani-Dimension: Runner de 100 Duelos Automatizados con IA y Generador de Métricas OCG
Ejecuta 100 duelos simulados distribuidos entre los 5 niveles de NPC (Nv. 5, 15, 30, 50, 100).
Entrena al Agente IA, valida la base de cartas de pruebas y genera informe completo de correcciones.
"""

import sys
import json
import time
from typing import Dict, List, Any

sys.stdout.reconfigure(encoding='utf-8')
from ocg_simulator import OcgDuelSimulator, CARDS_DATABASE

def execute_100_duels():
    print("==========================================================================")
    print("⚡ ANI-DIMENSION: INICIANDO SUITE DE 100 DUELOS AUTOMATIZADOS DE IA OCG ⚡")
    print("==========================================================================")

    levels = [5, 15, 30, 50, 100]
    results_by_level = {lvl: {'total': 0, 'p1_wins': 0, 'p2_wins': 0, 'draws': 0, 'total_turns': 0} for lvl in levels}
    all_activated_cards = set()
    total_errors_found = 0

    start_time = time.time()
    total_duels = 100
    duels_per_level = 20

    duel_counter = 0

    for level in levels:
        print(f"\n🎮 === EJECUTANDO BATCH DE 20 DUELOS PARA NPC YUGI LEVEL {level} ===")
        for i in range(duels_per_level):
            duel_counter += 1
            # Jugador 1 es IA de Nivel 50 (Rival desafiante), Jugador 2 es el NPC de Nivel específico (5, 15, 30, 50, 100)
            sim = OcgDuelSimulator(p1_level=50, p2_level=level)
            result = sim.run_duel(max_turns=40)

            winner = result['winner']
            turns = result['turns']
            results_by_level[level]['total'] += 1
            results_by_level[level]['total_turns'] += turns

            if winner == 'player1':
                results_by_level[level]['p1_wins'] += 1
            elif winner == 'player2':
                results_by_level[level]['p2_wins'] += 1
            else:
                results_by_level[level]['draws'] += 1

            for card in result['cards_activated']:
                all_activated_cards.add(card)

            if result['errors']:
                total_errors_found += len(result['errors'])

            if duel_counter % 10 == 0 or i == duels_per_level - 1:
                print(f"   [Duelo #{duel_counter:03d}/100] Level {level:3d} -> Ganador: {winner} en {turns} turnos. (LP P1: {result['p1_lp']} | LP P2: {result['p2_lp']})")

    elapsed_time = round(time.time() - start_time, 2)

    # --- FEEDING POLICY weights ---
    policy_data = {
        'trained_at': time.strftime("%Y-%m-%d %H:%M:%S"),
        'total_duels': total_duels,
        'cards_tested': list(all_activated_cards),
        'level_performance': {}
    }

    print("\n==========================================================================")
    print("📊 RESUMEN FINAL DE LAS 100 SIMULACIONES DE DUELOS CON IA")
    print("==========================================================================")
    print(f"⏱️ Tiempo total de ejecución: {elapsed_time} segundos")
    print(f"🃏 Total de cartas de pruebas ejercitadas: {len(all_activated_cards)} / {len(CARDS_DATABASE)}")
    print(f"❌ Errores detectados en la simulación: {total_errors_found}")

    for lvl in levels:
        stats = results_by_level[lvl]
        win_rate_npc = round((stats['p2_wins'] / stats['total']) * 100, 1)
        avg_turns = round(stats['total_turns'] / stats['total'], 1)
        print(f"   • NPC Level {lvl:3d}: Victoria NPC: {stats['p2_wins']:2d}/20 ({win_rate_npc}%) | Promedio Turnos: {avg_turns}")
        policy_data['level_performance'][f"level_{lvl}"] = {
            'npc_win_rate': win_rate_npc,
            'avg_turns': avg_turns
        }

    # Guardar reporte JSON
    report_file = "c:/Users/oscar.castillo/Videos/Ani Dimension/backend/ai_agent/duel_simulation_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(policy_data, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Reporte guardado con éxito en: {report_file}")
    return policy_data

if __name__ == '__main__':
    execute_100_duels()
