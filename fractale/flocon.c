#include <stdio.h>
#include <math.h>

/* Calcule la longueur du périmètre du flocon de Koch après n itérations.
 * Longueur initiale du côté : L, triangle équilatéral donc 3 côtés. */
double perimetre_koch(double L, int n) {
    /* À chaque itération : le nombre de segments est multiplié par 4
     * et la longueur de chacun est divisée par 3 */
    int nb_segments = 3;
    for (int i = 0; i < n; i++) {
        nb_segments *= 4;
        L /= 3.0;
    }
    return nb_segments * L;
}

int main() {
    double L0 = 1.0;
    printf("Itération | Périmètre\n");
    printf("----------|----------\n");
    for (int n = 0; n <= 6; n++) {
        printf("    %d     | %.6f\n", n, perimetre_koch(L0, n));
    }
    /* Le périmètre tend vers l'infini ! */
    return 0;
}