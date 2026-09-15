#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#define N 10

void afficher_grille(char grille[N][N]) {
    int i;
    for (i = 0; i < N - 1; i++)
        printf("%s\n", grille[i]);
}

// Lit la ligne "a=14 b=7 C=20" et remplit cibles['a']=14, cibles['b']=7, etc.
void lire_cibles_cages(char ligne[251], int cibles[256]) {
    int i = 0;
    char lettre;
    int valeur;

    while (ligne[i] != '\0') {
        if ((ligne[i] >= 'a' && ligne[i] <= 'z') || (ligne[i] >= 'A' && ligne[i] <= 'Z')) {
            lettre = ligne[i];
            i += 2; // saute le '='
            valeur = 0;
            // lit les chiffres de la valeur
            while (ligne[i] >= '0' && ligne[i] <= '9') {
                valeur = valeur * 10 + (ligne[i] - '0');
                i++;
            }
            cibles[(int)lettre] = valeur;
        } else {
            i++; // saute les espaces
        }
    }
}

// Renvoie 1 si valeur est déjà placée sur cette ligne
int est_dans_ligne(char grille[N][N], int ligne, int valeur) {
    int j;
    for (j = 0; j < N - 1; j++)
        if (grille[ligne][j] == valeur + '0') return 1;
    return 0;
}

// Renvoie 1 si valeur est déjà placée dans cette colonne
int est_dans_colonne(char grille[N][N], int colonne, int valeur) {
    int i;
    for (i = 0; i < N - 1; i++)
        if (grille[i][colonne] == valeur + '0') return 1;
    return 0;
}

// Renvoie 1 si valeur est déjà placée dans le bloc 3x3 correspondant
int est_dans_bloc(char grille[N][N], int ligne, int col, int valeur) {
    int debut_ligne = (ligne / 3) * 3;
    int debut_col   = (col / 3) * 3;
    int i, j;

    for (i = 0; i < 3; i++)
        for (j = 0; j < 3; j++)
            if (grille[debut_ligne + i][debut_col + j] == valeur + '0') return 1;
    return 0;
}

// Calcule la somme des cases déjà remplies dans la cage
int somme_remplie_cage(char grille[N][N], char cages[N][N], char lettre) {
    int somme = 0;
    int i, j;

    for (i = 0; i < N - 1; i++)
        for (j = 0; j < N - 1; j++)
            // case appartient à la cage et est déjà remplie
            if (cages[i][j] == lettre && grille[i][j] != '.')
                somme += grille[i][j] - '0';
    return somme;
}

// Compte les cases encore vides dans la cage
int cases_vides_cage(char grille[N][N], char cages[N][N], char lettre) {
    int nb = 0;
    int i, j;

    for (i = 0; i < N - 1; i++)
        for (j = 0; j < N - 1; j++)
            if (cages[i][j] == lettre && grille[i][j] == '.') nb++;
    return nb;
}

// Renvoie 1 si valeur est déjà placée dans la cage
int est_dans_cage(char grille[N][N], char cages[N][N], char lettre, int valeur) {
    int i, j;

    for (i = 0; i < N - 1; i++)
        for (j = 0; j < N - 1; j++)
            if (cages[i][j] == lettre && grille[i][j] == valeur + '0') return 1;
    return 0;
}

// Vérifie que placer valeur ici ne rend pas la somme cible de la cage inatteignable
int compatible_avec_cage(char grille[N][N], char cages[N][N],
                         int cibles[256], int ligne, int col, int valeur) {
    char lettre         = cages[ligne][col];
    int  cible          = cibles[(int)lettre];
    int  nouvelle_somme = somme_remplie_cage(grille, cages, lettre) + valeur;
    int  cases_apres    = cases_vides_cage(grille, cages, lettre) - 1;

    // Si c'est la dernière case vide de la cage, la somme doit tomber pile
    if (cases_apres == 0)
        return (nouvelle_somme == cible);

    // Sinon on vérifie que ce qui reste à atteindre est possible
    // avec les cases restantes (min = 1+2+...+k, max = 9+8+...+(9-k+1))
    int somme_restante = cible - nouvelle_somme;
    int somme_min = cases_apres * (cases_apres + 1) / 2;
    int somme_max = cases_apres * (19 - cases_apres) / 2;

    return (somme_restante >= somme_min && somme_restante <= somme_max);
}

// Renvoie 1 si la grille ne contient plus aucun '.'
int grille_complete(char grille[N][N]) {
    int i, j;
    for (i = 0; i < N - 1; i++)
        for (j = 0; j < N - 1; j++)
            if (grille[i][j] == '.') return 0;
    return 1;
}

// Résout la grille par backtracking récursif
int resoudre(char grille[N][N], char cages[N][N], int cibles[256]) {
    int i, j, v;

    // Cas de base : plus aucune case vide, la grille est résolue
    if (grille_complete(grille)) return 1;

    // On cherche la première case vide
    for (i = 0; i < N - 1; i++) {
        for (j = 0; j < N - 1; j++) {
            if (grille[i][j] == '.') {

                // On essaie chaque valeur de 1 à 9
                for (v = 1; v <= 9; v++) {
                    // La valeur doit respecter toutes les contraintes
                    if (!est_dans_ligne(grille, i, v)
                     && !est_dans_colonne(grille, j, v)
                     && !est_dans_bloc(grille, i, j, v)
                     && !est_dans_cage(grille, cages, cages[i][j], v)
                     && compatible_avec_cage(grille, cages, cibles, i, j, v)) {

                        // On place la valeur et on résout la suite
                        grille[i][j] = v + '0';
                        if (resoudre(grille, cages, cibles)) return 1;

                        // La suite a échoué, on annule le placement
                        grille[i][j] = '.';
                    }
                }

                // Aucune valeur ne convient pour cette case, on remonte
                return 0;
            }
        }
    }

    return 1;
}

int main() {
    char grille[N][N];
    char cages[N][N];
    int  cibles[256];
    int  i;

    // Lecture des 9 lignes : grille et cages côte à côte
    for (i = 0; i < N - 1; i++) {
        scanf("%s%s", grille[i], cages[i]);
        fgetc(stdin);
    }

    // Lecture de la ligne des sommes cibles des cages
    char ligne_cibles[251] = "";
    scanf("%[^\n]", ligne_cibles);
    lire_cibles_cages(ligne_cibles, cibles);

    resoudre(grille, cages, cibles);
    afficher_grille(grille);

    return 0;
}