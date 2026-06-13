import { instance } from "../client";
import { gamesEndpoints } from "../endpoints";
import type { RemoteGame } from "@/types/games";

const GamesModule = {
  async getGames(): Promise<RemoteGame[] | { games: RemoteGame[] }> {
    const { data } = await instance.get(gamesEndpoints.games);
    return data;
  },

  async completeGame(id: number | string) {
    const { data } = await instance.post(gamesEndpoints.completeGame(id));
    return data;
  },

  async reclamSeen(gameId: number | string, type: "ad" | "paid") {
    const { data } = await instance.post(gamesEndpoints.reclamSeen, {
      gameId,
      type,
    });
    return data;
  },
};

export { GamesModule };
