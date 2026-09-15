import sys
h = int(input())
w = int(input())
grille = []
for i in range(h):
    ligne = input()
    grille.append(ligne)

count = 0
directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

for i in range(h):
    if grille[i][0] == '+':
        file = [(i, 0)]
        visite = []
        for r in range(h):
            visite.append([False] * w)
        visite[i][0] = True
        trouve = False
        j = 0

        while j < len(file) and not trouve:
            ligne, col = file[j]
            j += 1
            if col == w - 1:
                trouve = True
            else:
                for dl, dc in directions:
                    nl, nc = ligne + dl, col + dc
                    if 0 <= nl < h and 0 <= nc < w:
                        if grille[nl][nc*2] == '+' and not visite[nl][nc]:
                            visite[nl][nc] = True
                            file.append((nl, nc))

        if trouve:
            count += 1

print(count)