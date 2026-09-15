import sys

# Lecture de la largeur et hauteur depuis la première ligne d'entrée
largeur, hauteur = [int(i) for i in input().split()]

# Lecture et stockage de chaque ligne de la grille
grille = []
for i in range(hauteur):
    grille.append(input())

# Parcours de chaque case de la grille
for ligne in range(hauteur):
    resultat = ""
    for col in range(largeur):

        if grille[ligne][col] == '#':
            # Case mur : on la recopie telle quelle
            resultat += '#'
        else:
            # Case passage : on compte les voisins adjacents qui sont aussi des passages
            compteur = 0

            # On teste les 4 directions : haut, bas, gauche, droite
            for delta_ligne, delta_col in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                voisin_ligne = ligne + delta_ligne
                voisin_col = col + delta_col

                # On vérifie que le voisin est bien dans les limites de la grille
                if 0 <= voisin_ligne < hauteur and 0 <= voisin_col < largeur:
                    if grille[voisin_ligne][voisin_col] == '0':
                        compteur += 1

            # On remplace le 0 par le nombre de passages adjacents
            resultat += str(compteur)

    # On affiche la ligne transformée
    print(resultat)