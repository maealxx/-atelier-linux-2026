fingerprint = input()

# Symboles utilisés pour représenter le nombre de passages sur une case
SYMBOLES = [' ', '.', 'o', '+', '=', '*', 'B', 'O', 'X', '@', '%', '&', '#', '/', '^']
LARGEUR, HAUTEUR = 17, 9

# Grille qui va compter le nombre de passages sur chaque case
grille = [[0] * LARGEUR for i in range(HAUTEUR)]

# Position de départ du curseur
x, y = 8, 4
depart = (x, y)

# On sépare l'empreinte en octets
liste_octets = fingerprint.split(':')

for octet in liste_octets:
    # On convertit l'octet hexadécimal en entier
    valeur = int(octet, 16)
    for n in range(4):
        # On extrait la n-ième paire de bits (de droite à gauche)
        paire = (valeur >> (n * 2)) & 0b11

        # On associe chaque paire à une direction diagonale
        if paire == 0b00:
            dx, dy = -1, -1  # haut-gauche
        elif paire == 0b01:
            dx, dy = 1, -1   # haut-droite
        elif paire == 0b10:
            dx, dy = -1, 1   # bas-gauche
        else:
            dx, dy = 1, 1    # bas-droite

        nx = x + dx
        ny = y + dy

        # Si le curseur sort de la grille, on annule le déplacement sur l'axe concerné
        if nx < 0 or nx >= LARGEUR:
            nx = x
        if ny < 0 or ny >= HAUTEUR:
            ny = y

        x, y = nx, ny
        # On incrémente le compteur de la case visitée
        grille[y][x] += 1

# On mémorise la position finale
arrivee = (x, y)

print("+---[CODINGAME]---+")
for i in range(HAUTEUR):
    ligne = "|"
    for j in range(LARGEUR):
        # On place S au départ, E à l'arrivée, sinon le symbole correspondant
        if (j, i) == depart:
            ligne += "S"
        elif (j, i) == arrivee:
            ligne += "E"
        else:
            # Le modulo évite de dépasser la taille de la liste
            ligne += SYMBOLES[grille[i][j] % len(SYMBOLES)]
    print(ligne + "|")
print("+-----------------+")