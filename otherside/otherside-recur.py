h = int(input())
w = int(input())

grille = []
for i in range(h):
    ligne = input()
    grille.append(ligne)

directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def dfs(ligne, col, visite):
    if col == w - 1:
        return True
    for dl, dc in directions:
        nl, nc = ligne + dl, col + dc
        if 0 <= nl < h and 0 <= nc < w:
            if grille[nl][nc*2] == '+' and not visite[nl][nc]:
                visite[nl][nc] = True
                if dfs(nl, nc, visite):
                    return True
    return False

count = 0

for i in range(h):
    if grille[i][0] == '+':
        visite = []
        for r in range(h):
            visite.append([False] * w)
        visite[i][0] = True
        if dfs(i, 0, visite):
            count += 1

print(count)