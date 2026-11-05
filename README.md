# Atelier Linux 2026 — Puzzles CodinGame en C et Python

Projets réalisés pendant l'atelier Linux de 1ère année de classe préparatoire **Prep'ISIMA** (2025-2026).

Chaque projet résout un puzzle [CodinGame](https://www.codingame.com/) ou explore un sujet technique, et s'accompagne d'un **rapport** rédigé en Org-mode ou en Markdown qui explique la démarche, l'algorithme choisi et les difficultés rencontrées.

![C](https://img.shields.io/badge/C-00599C?logo=c&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Bash](https://img.shields.io/badge/Bash-4EAA25?logo=gnubash&logoColor=white)
![Org-mode](https://img.shields.io/badge/Org--mode-77AA99?logo=org&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-000000?logo=markdown&logoColor=white)

---

## Projets

| # | Projet | Langage | Notions principales | Code | Rapport |
|---|--------|---------|---------------------|------|---------|
| 01 | **Drunken Bishop** | Python | Simulation sur grille, empreintes SSH | [`bishop.py`](bishop/bishop.py) | [rapport](bishop/rapport_bishop.md) |
| 02 | **The Other Side** | Python | Parcours de graphe (DFS récursif, BFS itératif) | [`otherside-recur.py`](otherside/otherside-recur.py) · [`otherside_iter.py`](otherside/otherside_iter.py) | [rapport](otherside/rapport_other_side.md) |
| 03 | **Les Fractales** | C · Python | Flocon de Koch, ensemble de Mandelbrot | [`flocon.c`](fractale/flocon.c) · [`mendelbrot.py`](fractale/mendelbrot.py) | [rapport](fractale/fractales.md) |
| 04 | **Mot de passe** | — | Sécurité, attaques par force brute et dictionnaire | — | [rapport](orgmode/mot_de_passe.org) |
| 05 | **Pikaptcha (EP1 & EP2)** | Python | Grilles, suivi de mur | [`pikachu_ep1.py`](pikachu/pikachu_ep1.py) · [`pikachu_ep2.py`](pikachu/pikachu_ep2.py) | [rapport](pikachu/rapport_pikachu.org) |
| 06 | **Killer Sudoku** | C | Backtracking, contraintes de cages | [`sudoku.c`](sudoku/sudoku.c) | [rapport](sudoku/rapport_sudoku.org) |
| 07 | **Tic-Tac-Toe / Ultimate Tic-Tac-Toe** | C | IA de jeu, Minimax | [`ultimate_bois.c`](tictactoe/ultimate_bois.c) · [`ultimate_argent.c`](tictactoe/ultimate_argent.c) | [rapport](tictactoe/rapport_tictactoe.org) |
| 08 | **Brainfuck** | C | Écriture d'un interpréteur | [`brainfuck.c`](brainfuck/brainfuck.c) | [rapport](brainfuck/rapport_brainfuck.org) |
| 09 | **Longest Coast** | C | DFS, composantes connexes | [`coast.c`](coast/coast.c) | [rapport](coast/rapport_longuest_coast.org) |
| 10 | **Couleurs dans le terminal** | C · Bash | Séquences ANSI, personnalisation de `PS1` | — | [rapport](couleurs/rapport_couleur.org) |
| 11 | **The Labyrinth** | C | BFS, exploration d'un labyrinthe inconnu, documentation Doxygen | [`labyrinthe.c`](labyrinthe/labyrinthe.c) | [rapport](labyrinthe/rapport_labyrinthe.org) · [doc Doxygen](labyrinthe/html/index.html) |

> Chaque rapport existe aussi en version HTML (`.html`) avec une navigation commune. La page [`index.html`](index.html) les relie tous sous forme de carte de projets.

---

## Compiler et lancer

Les programmes lisent leurs données sur l'entrée standard, comme sur CodinGame.

**En C**

```bash
gcc -Wall -Wextra -o sudoku sudoku/sudoku.c
./sudoku < entree.txt
```

Pour `fractale/flocon.c`, qui utilise la bibliothèque mathématique :

```bash
gcc -Wall -o flocon fractale/flocon.c -lm
```

**En Python** (Python 3)

```bash
python3 bishop/bishop.py < entree.txt
```

`fractale/mendelbrot.py` nécessite Pygame (`pip install pygame`). Ce programme est un exemple existant (auteur indiqué dans l'en-tête du fichier : Mathieu), étudié dans le rapport sur les fractales.

---

## Organisation du dépôt

```
.
├── index.html        # page d'accueil reliant tous les rapports
├── css/              # styles et navigation communs aux rapports HTML
├── images/           # illustrations utilisées dans les rapports
└── <projet>/         # un dossier par projet : code source + rapport (.org/.md + .html)
```

---

## Auteur

**Maé ALEXANDRE** — Prep'ISIMA, 1ère année (2025-2026)
