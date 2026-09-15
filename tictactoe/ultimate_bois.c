#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

int board[3][3];

int check_winner() {
    for (int i = 0; i < 3; i++) {
        if (board[i][0] != 0 && board[i][0] == board[i][1] && board[i][1] == board[i][2])
            return board[i][0];
        if (board[0][i] != 0 && board[0][i] == board[1][i] && board[1][i] == board[2][i])
            return board[0][i];
    }
    if (board[0][0] != 0 && board[0][0] == board[1][1] && board[1][1] == board[2][2])
        return board[0][0];
    if (board[0][2] != 0 && board[0][2] == board[1][1] && board[1][1] == board[2][0])
        return board[0][2];
    return 0;
}

bool is_full() {
    for (int r = 0; r < 3; r++)
        for (int c = 0; c < 3; c++)
            if (board[r][c] == 0)
                return false;
    return true;
}

int minimax(bool is_my_turn, int depth) {
    int winner = check_winner();
    if (winner == 1)  return 10 - depth;
    if (winner == -1) return depth - 10;
    if (is_full())    return 0;

    if (is_my_turn) {
        int best = -100;
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (board[r][c] == 0) {
                    board[r][c] = 1;
                    int score = minimax(false, depth + 1);
                    board[r][c] = 0;
                    if (score > best) best = score;
                }
            }
        }
        return best;
    } else {
        int best = 100;
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (board[r][c] == 0) {
                    board[r][c] = -1;
                    int score = minimax(true, depth + 1);
                    board[r][c] = 0;
                    if (score < best) best = score;
                }
            }
        }
        return best;
    }
}

void best_move(int *best_row, int *best_col) {
    int best_score = -100;
    *best_row = -1;
    *best_col = -1;
    for (int r = 0; r < 3; r++) {
        for (int c = 0; c < 3; c++) {
            if (board[r][c] == 0) {
                board[r][c] = 1;
                int score = minimax(false, 0);
                board[r][c] = 0;
                if (score > best_score) {
                    best_score = score;
                    *best_row = r;
                    *best_col = c;
                }
            }
        }
    }
}

int main() {
    for (int r = 0; r < 3; r++)
        for (int c = 0; c < 3; c++)
            board[r][c] = 0;

    while (1) {
        int opp_row, opp_col;
        scanf("%d%d", &opp_row, &opp_col);

        if (opp_row != -1)
            board[opp_row][opp_col] = -1;

        int valid_action_count;
        scanf("%d", &valid_action_count);
        for (int i = 0; i < valid_action_count; i++) {
            int row, col;
            scanf("%d%d", &row, &col);
        }

        int my_row, my_col;
        best_move(&my_row, &my_col);
        board[my_row][my_col] = 1;
        printf("%d %d\n", my_row, my_col);
    }

    return 0;
}