/**
 * @file labyrinthe.c
 * @brief Bot Rick pour le puzzle "The Labyrinth" sur CodingGame.
 *
 * Rick explore un labyrinthe inconnu, trouve la salle de commande (C),
 * appuie dessus, puis revient à son point de départ (T) avant que
 * l'alarme n'expire. On utilise BFS pour explorer, se diriger et
 * précalculer le chemin de retour.
 *
 * @author ALEXANDRE Maé
 * @date 2025-2026
 */

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

/* ------------------------------------------------------------------ */
/* @defgroup config Constantes de configuration                        */
/* ------------------------------------------------------------------ */

/** Nombre maximum de lignes de la grille. */
#define MAXR    100

/** Nombre maximum de colonnes de la grille. */
#define MAXC    200

/** Taille maximale du chemin de retour stocké. */
#define MAXPATH 20000

/* ------------------------------------------------------------------ */
/* @defgroup globals Variables globales                                */
/* ------------------------------------------------------------------ */

/** Nombre réel de lignes (lu en entrée). */
int R;

/** Nombre réel de colonnes (lu en entrée). */
int C;

/** Budget de tours pour revenir après avoir atteint C. */
int A;

/** Carte persistante du labyrinthe. '?' = case encore inconnue. */
char grille[MAXR][MAXC];

/** Deltas de ligne pour les 4 directions : haut, bas, gauche, droite. */
int deltaLigne[4] = {-1, 1, 0, 0};

/** Deltas de colonne pour les 4 directions : haut, bas, gauche, droite. */
int deltaCol[4] = {0, 0, -1, 1};

/** Noms des directions, dans le même ordre que deltaLigne / deltaCol. */
char *nomDir[4] = {"UP", "DOWN", "LEFT", "RIGHT"};

/* ------------------------------------------------------------------ */
/* @defgroup retour Chemin de retour préenregistré                     */
/*                                                                     */
/* Précalculé une seule fois quand Rick arrive sur C,                  */
/* puis rejoué pas à pas.                                              */
/* ------------------------------------------------------------------ */

/** Indices de direction du chemin de retour (0=UP 1=DOWN 2=LEFT 3=RIGHT). */
int cheminRetour[MAXPATH];

/** Nombre total de pas dans le chemin de retour. */
int longueurChemin = 0;

/** Indice du prochain pas à jouer dans cheminRetour. */
int indexChemin = 0;

/* ------------------------------------------------------------------ */
/* Structures                                                          */
/* ------------------------------------------------------------------ */

/**
 * @brief Nœud représentant une case de la grille.
 */
typedef struct {
    int r; /**< Ligne de la case. */
    int c; /**< Colonne de la case. */
} Node;

/* ------------------------------------------------------------------ */
/* Fonctions                                                           */
/* ------------------------------------------------------------------ */

/**
 * @brief Vérifie qu'une case est dans les limites de la grille.
 *
 * @param r Ligne à tester.
 * @param c Colonne à tester.
 * @return true si (r, c) est dans [0, R[ x [0, C[, false sinon.
 */
bool inBounds(int r, int c) {
    return r >= 0 && r < R && c >= 0 && c < C;
}

/**
 * @brief Calcule la distance BFS entre deux cases en évitant '#' et '?'.
 *
 * Utilisée pour vérifier que la distance de retour depuis C
 * est inférieure ou égale au budget A avant de s'engager vers C.
 *
 * @param ligneDepart Ligne source.
 * @param colDepart   Colonne source.
 * @param ligneCible  Ligne cible.
 * @param colCible    Colonne cible.
 * @return Distance en nombre de cases, ou -1 si aucun chemin n'existe.
 */
int bfs_distance(int ligneDepart, int colDepart, int ligneCible, int colCible) {
    int  dejaVu[MAXR][MAXC] = {0};
    int  distTab[MAXR][MAXC];
    Node file[MAXR * MAXC];
    int  debut = 0, fin = 0;

    file[fin++]                     = (Node){ligneDepart, colDepart};
    dejaVu[ligneDepart][colDepart]  = 1;
    distTab[ligneDepart][colDepart] = 0;

    while (debut < fin) {
        Node courant = file[debut++];

        if (courant.r == ligneCible && courant.c == colCible)
            return distTab[courant.r][courant.c];

        for (int i = 0; i < 4; i++) {
            int nouvLigne = courant.r + deltaLigne[i];
            int nouvCol   = courant.c + deltaCol[i];

            if (inBounds(nouvLigne, nouvCol) && !dejaVu[nouvLigne][nouvCol] &&
                grille[nouvLigne][nouvCol] != '#' && grille[nouvLigne][nouvCol] != '?') {
                dejaVu[nouvLigne][nouvCol]  = 1;
                distTab[nouvLigne][nouvCol] = distTab[courant.r][courant.c] + 1;
                file[fin++]                 = (Node){nouvLigne, nouvCol};
            }
        }
    }
    return -1;
}

/**
 * @brief Renvoie la direction du premier pas BFS vers un caractère cible.
 *
 * Parcourt la carte en autorisant les cases '?' (on sait déjà où est
 * la cible donc on peut traverser l'inconnu). Remonte le tableau
 * parent pour identifier le voisin direct de la source, puis déduit
 * la direction à prendre.
 *
 * @param ligneDepart Ligne source (position actuelle de Rick).
 * @param colDepart   Colonne source.
 * @param cible       Caractère cible à atteindre (ex. 'C').
 * @return Chaîne de direction ("UP", "DOWN", "LEFT", "RIGHT"),
 *         ou NULL si la cible est inaccessible.
 */
char* bfs_move(int ligneDepart, int colDepart, char cible) {
    int  dejaVu[MAXR][MAXC] = {0};
    Node parentTab[MAXR][MAXC];
    Node file[MAXR * MAXC];
    int  debut = 0, fin = 0;

    file[fin++]                    = (Node){ligneDepart, colDepart};
    dejaVu[ligneDepart][colDepart] = 1;

    while (debut < fin) {
        Node courant = file[debut++];

        if (grille[courant.r][courant.c] == cible) {
            // on remonte le chemin pour trouver le premier pas depuis la source
            Node retour = courant;
            while (!(parentTab[retour.r][retour.c].r == ligneDepart &&
                     parentTab[retour.r][retour.c].c == colDepart)) {
                retour = parentTab[retour.r][retour.c];
            }
            for (int d = 0; d < 4; d++) {
                if (ligneDepart + deltaLigne[d] == retour.r &&
                    colDepart   + deltaCol[d]   == retour.c)
                    return nomDir[d];
            }
        }

        for (int i = 0; i < 4; i++) {
            int nouvLigne = courant.r + deltaLigne[i];
            int nouvCol   = courant.c + deltaCol[i];
            // on autorise les '?' ici puisqu'on sait déjà où est la cible
            if (inBounds(nouvLigne, nouvCol) && !dejaVu[nouvLigne][nouvCol] &&
                grille[nouvLigne][nouvCol] != '#') {
                dejaVu[nouvLigne][nouvCol]    = 1;
                parentTab[nouvLigne][nouvCol] = courant;
                file[fin++]                   = (Node){nouvLigne, nouvCol};
            }
        }
    }
    return NULL;
}

/**
 * @brief Renvoie la direction vers la zone inconnue ('?') la plus proche.
 *
 * Effectue un BFS sur le terrain connu uniquement (sans '#' ni '?').
 * Pour chaque case visitée, inspecte ses voisins immédiats : dès qu'un
 * voisin est '?', on se dirige vers lui sans le traverser.
 *
 * @param ligneDepart Ligne source.
 * @param colDepart   Colonne source.
 * @return Chaîne de direction vers la frontière inconnue,
 *         ou NULL si aucune zone '?' n'est atteignable.
 */
char* bfs_explore(int ligneDepart, int colDepart) {
    int  dejaVu[MAXR][MAXC] = {0};
    Node parentTab[MAXR][MAXC];
    Node file[MAXR * MAXC];
    int  debut = 0, fin = 0;

    file[fin++]                    = (Node){ligneDepart, colDepart};
    dejaVu[ligneDepart][colDepart] = 1;

    while (debut < fin) {
        Node courant = file[debut++];

        // on regarde si y'a une case inconnue à côté
        for (int i = 0; i < 4; i++) {
            int nouvLigne = courant.r + deltaLigne[i];
            int nouvCol   = courant.c + deltaCol[i];

            if (inBounds(nouvLigne, nouvCol) && grille[nouvLigne][nouvCol] == '?') {
                // on remonte le chemin pour trouver le premier pas
                Node retour = courant;
                while (!(parentTab[retour.r][retour.c].r == ligneDepart &&
                         parentTab[retour.r][retour.c].c == colDepart)) {
                    retour = parentTab[retour.r][retour.c];
                }
                // variable de boucle différente (d) pour éviter le shadowing
                for (int d = 0; d < 4; d++) {
                    if (ligneDepart + deltaLigne[d] == retour.r &&
                        colDepart   + deltaCol[d]   == retour.c)
                        return nomDir[d];
                }
            }
        }

        // on avance seulement sur les cases connues et pas des murs
        for (int i = 0; i < 4; i++) {
            int nouvLigne = courant.r + deltaLigne[i];
            int nouvCol   = courant.c + deltaCol[i];
            if (inBounds(nouvLigne, nouvCol) && !dejaVu[nouvLigne][nouvCol] &&
                grille[nouvLigne][nouvCol] != '#' && grille[nouvLigne][nouvCol] != '?') {
                dejaVu[nouvLigne][nouvCol]    = 1;
                parentTab[nouvLigne][nouvCol] = courant;
                file[fin++]                   = (Node){nouvLigne, nouvCol};
            }
        }
    }
    return NULL;
}

/**
 * @brief Construit le chemin BFS optimal de (ligneDepart, colDepart)
 *        à (ligneCible, colCible) et le stocke dans cheminRetour[].
 *
 * Reconstruit le chemin à rebours via le tableau parent, puis
 * l'inverse pour l'obtenir dans le bon sens (source -> cible).
 * Les cases '#' et '?' sont exclues du parcours.
 *
 * @param ligneDepart Ligne source (position de Rick sur C au moment de l'appel).
 * @param colDepart   Colonne source.
 * @param ligneCible  Ligne cible (position de départ T).
 * @param colCible    Colonne cible.
 */
void bfs_build_path(int ligneDepart, int colDepart, int ligneCible, int colCible) {
    int  dejaVu[MAXR][MAXC] = {0};
    Node parentTab[MAXR][MAXC];
    Node file[MAXR * MAXC];
    int  debut = 0, fin = 0;

    file[fin++]                    = (Node){ligneDepart, colDepart};
    dejaVu[ligneDepart][colDepart] = 1;

    while (debut < fin) {
        Node courant = file[debut++];

        if (courant.r == ligneCible && courant.c == colCible) {
            // on reconstruit le chemin en remontant depuis la cible
            Node temp      = courant;
            longueurChemin = 0;
            while (!(temp.r == ligneDepart && temp.c == colDepart)) {
                Node p = parentTab[temp.r][temp.c];
                for (int d = 0; d < 4; d++) {
                    if (p.r + deltaLigne[d] == temp.r && p.c + deltaCol[d] == temp.c)
                        cheminRetour[longueurChemin++] = d;
                }
                temp = p;
            }
            // le chemin est à l'envers, on le retourne
            for (int i = 0; i < longueurChemin / 2; i++) {
                int tmp                              = cheminRetour[i];
                cheminRetour[i]                      = cheminRetour[longueurChemin - i - 1];
                cheminRetour[longueurChemin - i - 1] = tmp;
            }
            indexChemin = 0;
            return;
        }

        for (int i = 0; i < 4; i++) {
            int nouvLigne = courant.r + deltaLigne[i];
            int nouvCol   = courant.c + deltaCol[i];
            if (inBounds(nouvLigne, nouvCol) && !dejaVu[nouvLigne][nouvCol] &&
                grille[nouvLigne][nouvCol] != '#' && grille[nouvLigne][nouvCol] != '?') {
                dejaVu[nouvLigne][nouvCol]    = 1;
                parentTab[nouvLigne][nouvCol] = courant;
                file[fin++]                   = (Node){nouvLigne, nouvCol};
            }
        }
    }
}

/**
 * @brief Point d'entrée — boucle principale du jeu.
 *
 * Lit les dimensions et le budget d'alarme, initialise la carte à '?',
 * puis tourne en boucle infinie. À chaque tour, met à jour la carte,
 * évalue l'état courant (exploration / aller vers C / retour vers T)
 * et émet une direction sur stdout.
 *
 * @return 0 (jamais atteint en pratique).
 */
int main() {
    scanf("%d%d%d", &R, &C, &A);

    // au début on ne connaît rien, tout est marqué inconnu
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++)
            grille[i][j] = '?';

    int  ligneStart = -1, colStart = -1; // position de départ T, mémorisée dès qu'on la voit
    bool goingToC   = false;             // true quand on s'engage vers C
    bool onRentre   = false;             // true quand l'alarme est déclenchée et qu'on rentre

    while (1) {
        int ligneRick, colRick;
        scanf("%d%d", &ligneRick, &colRick);

        // on met à jour la grille avec ce que Rick voit ce tour-ci
        for (int i = 0; i < R; i++) {
            char rangee[MAXC + 1];
            scanf("%s", rangee);
            for (int j = 0; j < C; j++) {
                if (rangee[j] != '?')
                    grille[i][j] = rangee[j];
                if (grille[i][j] == 'T') {
                    ligneStart = i;
                    colStart   = j;
                }
            }
        }

        // on cherche où est C sur la grille
        int ligneC = -1, colC = -1;
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                if (grille[i][j] == 'C') { ligneC = i; colC = j; }

        // si on est en mode retour on joue juste le chemin déjà calculé
        if (onRentre) {
            printf("%s\n", nomDir[cheminRetour[indexChemin++]]);
            continue;
        }

        char* mouvement = NULL;

        if (ligneC != -1) {
            // C est visible, on vérifie si on a le temps de rentrer après
            if (!goingToC) {
                int distVersC  = bfs_distance(ligneRick, colRick, ligneC, colC);
                int distRetour = bfs_distance(ligneC, colC, ligneStart, colStart);
                if (distVersC != -1 && distRetour != -1 && distRetour <= A)
                    goingToC = true;
            }

            if (goingToC) {
                if (ligneRick == ligneC && colRick == colC) {
                    // Rick est sur C, l'alarme se déclenche, on calcule le chemin retour
                    onRentre = true;
                    bfs_build_path(ligneRick, colRick, ligneStart, colStart);
                    printf("%s\n", nomDir[cheminRetour[indexChemin++]]);
                    continue;
                } else {
                    mouvement = bfs_move(ligneRick, colRick, 'C');
                }
            } else {
                // pas encore sûr de pouvoir rentrer, on continue d'explorer
                mouvement = bfs_explore(ligneRick, colRick);
            }
        } else {
            // C pas encore trouvé, on explore
            mouvement = bfs_explore(ligneRick, colRick);
        }

        if (mouvement == NULL) mouvement = "UP"; // au cas où y'a plus rien à explorer
        printf("%s\n", mouvement);
    }

    return 0;
}