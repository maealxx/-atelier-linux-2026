#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

int board[9][9];
int small_winner[3][3];

int check_small(int gr, int gc) {
    int b[3][3];
    for (int r = 0; r < 3; r++)
        for (int c = 0; c < 3; c++)
            b[r][c] = board[gr*3+r][gc*3+c];
    for (int i = 0; i < 3; i++) {
        if (b[i][0] != 0 && b[i][0] == b[i][1] && b[i][1] == b[i][2]) return b[i][0];
        if (b[0][i] != 0 && b[0][i] == b[1][i] && b[1][i] == b[2][i]) return b[0][i];
    }
    if (b[0][0] != 0 && b[0][0] == b[1][1] && b[1][1] == b[2][2]) return b[0][0];
    if (b[0][2] != 0 && b[0][2] == b[1][1] && b[1][1] == b[2][0]) return b[0][2];
    return 0;
}

int check_big() {
    int (*b)[3] = small_winner;
    for (int i = 0; i < 3; i++) {
        if (b[i][0] != 0 && b[i][0] == b[i][1] && b[i][1] == b[i][2]) return b[i][0];
        if (b[0][i] != 0 && b[0][i] == b[1][i] && b[1][i] == b[2][i]) return b[0][i];
    }
    if (b[0][0] != 0 && b[0][0] == b[1][1] && b[1][1] == b[2][2]) return b[0][0];
    if (b[0][2] != 0 && b[0][2] == b[1][1] && b[1][1] == b[2][0]) return b[0][2];
    return 0;
}

bool small_full(int gr, int gc) {
    for (int r = 0; r < 3; r++)
        for (int c = 0; c < 3; c++)
            if (board[gr*3+r][gc*3+c] == 0) return false;
    return true;
}

int score_line(int a, int b, int c) {
    int mine = (a==1) + (b==1) + (c==1);
    int his  = (a==-1) + (b==-1) + (c==-1);
    if (mine > 0 && his > 0) return 0;
    if (mine == 2) return 10;
    if (mine == 1) return 1;
    if (his  == 2) return -10;
    if (his  == 1) return -1;
    return 0;
}

int eval_small(int gr, int gc) {
    if (small_winner[gr][gc] == 1)  return 100;
    if (small_winner[gr][gc] == -1) return -100;
    int score = 0;
    int r0 = gr*3, c0 = gc*3;
    for (int r = 0; r < 3; r++)
        score += score_line(board[r0+r][c0], board[r0+r][c0+1], board[r0+r][c0+2]);
    for (int c = 0; c < 3; c++)
        score += score_line(board[r0][c0+c], board[r0+1][c0+c], board[r0+2][c0+c]);
    score += score_line(board[r0][c0],   board[r0+1][c0+1], board[r0+2][c0+2]);
    score += score_line(board[r0][c0+2], board[r0+1][c0+1], board[r0+2][c0]);
    return score;
}

int evaluate() {
    int big = check_big();
    if (big == 1)  return 100000;
    if (big == -1) return -100000;
    int score = 0;
    for (int i = 0; i < 3; i++) {
        score += score_line(small_winner[i][0], small_winner[i][1], small_winner[i][2]) * 50;
        score += score_line(small_winner[0][i], small_winner[1][i], small_winner[2][i]) * 50;
    }
    score += score_line(small_winner[0][0], small_winner[1][1], small_winner[2][2]) * 50;
    score += score_line(small_winner[0][2], small_winner[1][1], small_winner[2][0]) * 50;
    for (int gr = 0; gr < 3; gr++)
        for (int gc = 0; gc < 3; gc++)
            score += eval_small(gr, gc);
    return score;
}

int count_free(int next_gr, int next_gc) {
    int count = 0;
    for (int r = 0; r < 9; r++)
        for (int c = 0; c < 9; c++) {
            int gr = r/3, gc = c/3;
            if (board[r][c] != 0) continue;
            if (small_winner[gr][gc] != 0) continue;
            if (next_gr != -1 && (gr != next_gr || gc != next_gc)) continue;
            count++;
        }
    return count;
}

int count_free_total() {
    int count = 0;
    for (int r = 0; r < 9; r++)
        for (int c = 0; c < 9; c++) {
            int gr = r/3, gc = c/3;
            if (board[r][c] == 0 && small_winner[gr][gc] == 0)
                count++;
        }
    return count;
}

int choose_depth(int free_total) {
    if (free_total <= 6)  return 6;
    if (free_total <= 10) return 5;
    if (free_total <= 20) return 4;
    if (free_total <= 40) return 3;
    return 2;
}

int minimax(bool is_my_turn, int depth, int alpha, int beta,
            int next_gr, int next_gc) {
    int big = check_big();
    if (big != 0)   return big * 100000;
    if (depth == 0) return evaluate();

    int player = is_my_turn ? 1 : -1;
    int best   = is_my_turn ? -200000 : 200000;
    bool any_move = false;

    int order[9] = {4, 0, 2, 6, 8, 1, 3, 5, 7};

    for (int gi = 0; gi < 9; gi++) {
        int idx = order[gi];
        int r_local = idx / 3, c_local = idx % 3;

        for (int gr = 0; gr < 3; gr++) {
            for (int gc = 0; gc < 3; gc++) {
                if (next_gr != -1 && (gr != next_gr || gc != next_gc)) continue;
                if (small_winner[gr][gc] != 0) continue;

                int r = gr*3 + r_local;
                int c = gc*3 + c_local;
                if (board[r][c] != 0) continue;

                any_move = true;
                board[r][c] = player;

                int prev_small = small_winner[gr][gc];
                int w = check_small(gr, gc);
                if (w != 0) small_winner[gr][gc] = w;

                int imposed_gr = r_local, imposed_gc = c_local;
                if (small_winner[imposed_gr][imposed_gc] != 0
                    || small_full(imposed_gr, imposed_gc)) {
                    imposed_gr = -1;
                    imposed_gc = -1;
                }

                int score = minimax(!is_my_turn, depth - 1, alpha, beta,
                                    imposed_gr, imposed_gc);

                board[r][c] = 0;
                small_winner[gr][gc] = prev_small;

                if (is_my_turn) {
                    if (score > best) best = score;
                    if (best > alpha) alpha = best;
                } else {
                    if (score < best) best = score;
                    if (best < beta)  beta = best;
                }

                if (beta <= alpha) goto done;
            }
        }
    }

    done:
    if (!any_move) return evaluate();
    return best;
}

void best_move(int next_gr, int next_gc, int *best_r, int *best_c) {
    int free_zone  = count_free(next_gr, next_gc);
    int free_total = count_free_total();
    int depth = choose_depth(free_total);

    fprintf(stderr, "zone=%d total=%d depth=%d\n", free_zone, free_total, depth);

    int best_score = -200000;
    *best_r = -1;
    *best_c = -1;

    int order[9] = {4, 0, 2, 6, 8, 1, 3, 5, 7};

    for (int gi = 0; gi < 9; gi++) {
        int idx = order[gi];
        int r_local = idx / 3, c_local = idx % 3;

        for (int gr = 0; gr < 3; gr++) {
            for (int gc = 0; gc < 3; gc++) {
                if (next_gr != -1 && (gr != next_gr || gc != next_gc)) continue;
                if (small_winner[gr][gc] != 0) continue;

                int r = gr*3 + r_local;
                int c = gc*3 + c_local;
                if (board[r][c] != 0) continue;

                board[r][c] = 1;

                int prev_small = small_winner[gr][gc];
                int w = check_small(gr, gc);
                if (w != 0) small_winner[gr][gc] = w;

                int imposed_gr = r_local, imposed_gc = c_local;
                if (small_winner[imposed_gr][imposed_gc] != 0
                    || small_full(imposed_gr, imposed_gc)) {
                    imposed_gr = -1;
                    imposed_gc = -1;
                }

                int score = minimax(false, depth, -200000, 200000,
                                    imposed_gr, imposed_gc);

                board[r][c] = 0;
                small_winner[gr][gc] = prev_small;

                if (score > best_score) {
                    best_score = score;
                    *best_r = r;
                    *best_c = c;
                }
            }
        }
    }
}

int main() {
    memset(board, 0, sizeof(board));
    memset(small_winner, 0, sizeof(small_winner));

    while (1) {
        int opp_row, opp_col;
        scanf("%d%d", &opp_row, &opp_col);

        int next_gr = -1, next_gc = -1;

        if (opp_row != -1) {
            board[opp_row][opp_col] = -1;
            int gr = opp_row/3, gc = opp_col/3;
            int w = check_small(gr, gc);
            if (w != 0) small_winner[gr][gc] = w;

            next_gr = opp_row % 3;
            next_gc = opp_col % 3;
            if (small_winner[next_gr][next_gc] != 0 || small_full(next_gr, next_gc)) {
                next_gr = -1;
                next_gc = -1;
            }
        }

        int valid_action_count;
        scanf("%d", &valid_action_count);
        for (int i = 0; i < valid_action_count; i++) {
            int row, col;
            scanf("%d%d", &row, &col);
        }

        int my_r, my_c;
        best_move(next_gr, next_gc, &my_r, &my_c);

        board[my_r][my_c] = 1;
        int gr = my_r/3, gc = my_c/3;
        int w = check_small(gr, gc);
        if (w != 0) small_winner[gr][gc] = w;

        printf("%d %d\n", my_r, my_c);
    }

    return 0;
}