#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

int main()
{
    int L, S, N;
    scanf("%d%d%d", &L, &S, &N); fgetc(stdin);

    /* Lire le programme (L lignes) et les concaténer */
    char prog[L * 1025 + 1];
    prog[0] = '\0';
    for (int i = 0; i < L; i++) {
        char r[1025] = "";
        scanf("%[^\n]", r); fgetc(stdin);
        strcat(prog, r);
    }

    /* Lire les inputs */
    int inputs[N];
    for (int i = 0; i < N; i++)
        scanf("%d", &inputs[i]);

    int plen = strlen(prog);

    /* Vérification syntaxique : brackets équilibrés */
    int depth = 0;
    for (int i = 0; i < plen; i++) {
        if (prog[i] == '[') depth++;
        else if (prog[i] == ']') depth--;
        if (depth < 0) { printf("SYNTAX ERROR\n"); return 0; }
    }
    if (depth != 0) { printf("SYNTAX ERROR\n"); return 0; }

    /* Tableau de cellules */
    int cells[S];
    memset(cells, 0, sizeof(int) * S);

    int ptr = 0;       /* pointeur de cellule */
    int ip  = 0;       /* pointeur d'instruction */
    int inp = 0;       /* index input */
    bool first = true; /* pour gérer le séparateur de sortie */

    char output[100000];
    int  out_len = 0;

    while (ip < plen) {
        char cmd = prog[ip];

        if (cmd == '>') {
            ptr++;
            if (ptr >= S) { printf("POINTER OUT OF BOUNDS\n"); return 0; }
        }
        else if (cmd == '<') {
            ptr--;
            if (ptr < 0) { printf("POINTER OUT OF BOUNDS\n"); return 0; }
        }
        else if (cmd == '+') {
            cells[ptr]++;
            if (cells[ptr] > 255) { printf("INCORRECT VALUE\n"); return 0; }
        }
        else if (cmd == '-') {
            cells[ptr]--;
            if (cells[ptr] < 0) { printf("INCORRECT VALUE\n"); return 0; }
        }
        else if (cmd == '.') {
            output[out_len++] = (char)cells[ptr];
        }
        else if (cmd == ',') {
            cells[ptr] = (inp < N) ? inputs[inp++] : 0;
        }
        else if (cmd == '[') {
            if (cells[ptr] == 0) {
                /* Sauter au ] correspondant */
                int d = 1;
                while (d > 0) {
                    ip++;
                    if (prog[ip] == '[') d++;
                    else if (prog[ip] == ']') d--;
                }
            }
        }
        else if (cmd == ']') {
            if (cells[ptr] != 0) {
                /* Revenir au [ correspondant */
                int d = 1;
                while (d > 0) {
                    ip--;
                    if (prog[ip] == ']') d++;
                    else if (prog[ip] == '[') d--;
                }
            }
        }
        ip++;
    }

    /* Affichage de la sortie */
    output[out_len] = '\0';
    printf("%s\n", output);

    return 0;
}