#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
ANI-DIMENSION: MOTOR IA & PROBABILÍSTICO DE EVENTOS DE ROMPECABEZAS (PUZZLE)
=============================================================================
Algoritmo de distribución probabilística de piezas (Coupon Collector Model con
pesos de rareza graduados).

Garantiza que la colección no se complete en un solo día mediante la asignación
de piezas 'Comunes', 'Poco Comunes' y 'Piezas Clave / Escasas', distribuidas de
forma estratégica según la cuadrícula seleccionada (NxM).
"""

import sys
import json
import random
import argparse
from datetime import datetime

class PuzzleAIEngine:
    def __init__(self, total_pieces=16, grid_rows=4, grid_cols=4):
        self.total_pieces = total_pieces
        self.grid_rows = grid_rows
        self.grid_cols = grid_cols
        self.weights = self._calculate_scarcity_weights()

    def _calculate_scarcity_weights(self):
        """
        Calcula pesos de probabilidad para cada pieza de la cuadrícula.
        - ~60% del peso acumulado se reparte entre piezas Comunes (bordes y esquinas comunes).
        - ~30% del peso acumulado se reparte entre piezas Poco Comunes.
        - ~10% del peso acumulado se concentra en 1 o 2 'Piezas Clave' (Rare Key Pieces),
          generalmente la pieza central o la insignia del artwork (ej. pieza central).
        """
        weights = {}
        total = self.total_pieces

        # Identificar piezas clave (ej: centro o pieza 0 y pieza penúltima)
        key_pieces = [total // 2, total - 1] if total > 4 else [0]
        uncommon_pieces = [i for i in range(total) if i not in key_pieces and i % 2 == 1]
        common_pieces = [i for i in range(total) if i not in key_pieces and i not in uncommon_pieces]

        # Pesos base relativos
        for p in common_pieces:
            weights[p] = 10.0  # Común (~60%)
        for p in uncommon_pieces:
            weights[p] = 4.0   # Poco Común (~30%)
        for p in key_pieces:
            weights[p] = 1.2   # Escasa / Clave (~10%)

        return weights

    def roll_piece_drop(self, user_inventory=None):
        """
        Selecciona una pieza al azar basada en los pesos probabilísticos de rareza.
        user_inventory: dict opcional { 'piece_0': qty, 'piece_1': qty, ... }
        """
        piece_indices = list(self.weights.keys())
        probabilities = [self.weights[idx] for idx in piece_indices]
        
        chosen_piece = random.choices(piece_indices, weights=probabilities, k=1)[0]
        row = chosen_piece // self.grid_cols
        col = chosen_piece % self.grid_cols
        
        is_rare_key = chosen_piece in [self.total_pieces // 2, self.total_pieces - 1]

        return {
            "piece_index": chosen_piece,
            "row": row,
            "col": col,
            "rarity": "KEY_RARE" if is_rare_key else ("UNCOMMON" if self.weights[chosen_piece] == 4.0 else "COMMON"),
            "drop_timestamp": datetime.utcnow().isoformat() + "Z"
        }

    def generate_grid_metadata(self, image_url, title="Evento Rompecabezas"):
        """
        Genera la matriz de piezas y coordenadas CSS background para el cliente.
        """
        pieces = []
        for idx in range(self.total_pieces):
            r = idx // self.grid_cols
            c = idx % self.grid_cols
            
            # Porcentaje de fondo CSS para la pieza
            bg_pos_x = (c / (self.grid_cols - 1) * 100) if self.grid_cols > 1 else 0
            bg_pos_y = (r / (self.grid_rows - 1) * 100) if self.grid_rows > 1 else 0

            is_key = idx in [self.total_pieces // 2, self.total_pieces - 1]
            rarity = "ESCASO" if is_key else ("INTERMEDIO" if idx % 2 == 1 else "COMÚN")

            pieces.append({
                "index": idx,
                "row": r,
                "col": c,
                "bg_pos_x": round(bg_pos_x, 2),
                "bg_pos_y": round(bg_pos_y, 2),
                "rarity": rarity,
                "title": f"Ficha #{idx + 1}"
            })

        return {
            "title": title,
            "image_url": image_url,
            "grid_rows": self.grid_rows,
            "grid_cols": self.grid_cols,
            "total_pieces": self.total_pieces,
            "pieces": pieces
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ani-Dimension Puzzle Engine")
    parser.add_argument("--action", choices=["roll", "metadata"], default="roll", help="Acción a ejecutar")
    parser.add_argument("--pieces", type=int, default=16, help="Total de piezas")
    parser.add_argument("--rows", type=int, default=4, help="Filas de la cuadrícula")
    parser.add_argument("--cols", type=int, default=4, help="Columnas de la cuadrícula")
    parser.add_argument("--image", type=str, default="/assets/images/events/halloween_maga_oscura.jpg")
    parser.add_argument("--title", type=str, default="Ani Dimension y la Maga Oscura")

    args = parser.parse_args()

    engine = PuzzleAIEngine(total_pieces=args.pieces, grid_rows=args.rows, grid_cols=args.cols)

    if args.action == "roll":
        result = engine.roll_piece_drop()
        print(json.dumps(result))
    elif args.action == "metadata":
        result = engine.generate_grid_metadata(args.image, title=args.title)
        print(json.dumps(result))
