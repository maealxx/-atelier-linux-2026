import sys

width, height = [int(i) for i in input().split()]

# Directions : Haut, Droite, Bas, Gauche
dy = [-1, 0, 1, 0]
dx = [0, 1, 0, -1]
dir_map = {'^': 0, '>': 1, 'v': 2, '<': 3}

# Lecture grille + détection départ
grille = []
start_x, start_y, start_dir = 0, 0, 0

for y in range(height):
    line = list(input())
    grille.append(line)
    for x in range(width):
        if line[x] in dir_map:
            start_x, start_y = x, y
            start_dir = dir_map[line[x]]
            grille[y][x] = '0'  # remplace le symbole par un passage

side = input().strip()

# Compteur de passages
compteur = [[0] * width for _ in range(height)]

x, y, d = start_x, start_y, start_dir

# Sens de rotation selon le mur suivi
if side == 'R':
    horaire = True
else:
    horaire = False

while True:
    # Calcul des 4 directions à tester dans l'ordre de priorité
    if horaire:
        vers_mur    = (d + 1) % 4
        tout_droit  = d
        autre_cote  = (d - 1) % 4
        demi_tour   = (d + 2) % 4
    else:
        vers_mur    = (d - 1) % 4
        tout_droit  = d
        autre_cote  = (d + 1) % 4
        demi_tour   = (d + 2) % 4

    ordre = [vers_mur, tout_droit, autre_cote, demi_tour]

    # Test de chaque direction dans l'ordre
    bouge = False
    for next_dir in ordre:
        nx = x + dx[next_dir]
        ny = y + dy[next_dir]
        dans_grille = 0 <= nx < width and 0 <= ny < height
        if dans_grille and grille[ny][nx] == '0':
            x, y, d = nx, ny, next_dir
            compteur[y][x] += 1
            bouge = True
            break

    # Arrêt si bloqué ou retour à la case de départ
    if not bouge:
        break
    if (x, y) == (start_x, start_y):
        break

# Affichage
for y in range(height):
    ligne = ""
    for x in range(width):
        if grille[y][x] == '#':
            ligne += '#'
        else:
            ligne += str(compteur[y][x])
    print(ligne)