#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

int n;
char grid[50][51];
bool visited[50][50];
bool water_counted[50][50];

int dx[] = {0, 0, 1, -1};
int dy[] = {1, -1, 0, 0};

int dfs(int x, int y) {
    if (x < 0 || x >= n || y < 0 || y >= n) return 0;
    if (visited[x][y]) return 0;
    if (grid[x][y] != '#') return 0;

    visited[x][y] = true;
    int coast = 0;

    for (int d = 0; d < 4; d++) {
        int nx = x + dx[d];
        int ny = y + dy[d];
        if (nx >= 0 && nx < n && ny >= 0 && ny < n && grid[nx][ny] == '~') {
            if (!water_counted[nx][ny]) {
                water_counted[nx][ny] = true;
                coast++;
            }
        } else if (nx >= 0 && nx < n && ny >= 0 && ny < n && grid[nx][ny] == '#') {
            coast += dfs(nx, ny);
        }
    }

    return coast;
}

int main() {
    scanf("%d", &n); fgetc(stdin);
    for (int i = 0; i < n; i++) {
        scanf("%[^\n]", grid[i]); fgetc(stdin);
    }

    int best_island = -1;
    int best_coast = -1;
    int island_index = 0;

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (grid[i][j] == '#' && !visited[i][j]) {
                island_index++;

                // reset du tableau water_counted avant chaque île
                for (int r = 0; r < n; r++)
                    for (int c = 0; c < n; c++)
                        water_counted[r][c] = false;

                int coast = dfs(i, j);
                if (coast > best_coast) {
                    best_coast = coast;
                    best_island = island_index;
                }
            }
        }
    }

    printf("%d %d\n", best_island, best_coast);
    return 0;
}