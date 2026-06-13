import { instance } from "../client";
import { challengesEndpoints } from "../endpoints";
import type {
  Challenge,
  ChallengeDay,
  ChallengeLeaderboardEntry,
  ChallengeProgress,
} from "@/types/challenges";

const ChallengesModule = {
  async getChallenges(): Promise<Challenge[]> {
    const { data } = await instance.get(challengesEndpoints.challenges);
    return data;
  },

  async getChallengeDetail(id: number | string): Promise<Challenge> {
    const { data } = await instance.get(challengesEndpoints.challengeDetail(id));
    return data;
  },

  async connectChallenge(id: number | string) {
    const { data } = await instance.post(challengesEndpoints.connectChallenge(id));
    return data;
  },

  async getChallengeDays(id: number | string): Promise<ChallengeDay[]> {
    const { data } = await instance.get(challengesEndpoints.challengeDays(id));
    return data;
  },

  async getDayGames(dayId: number | string) {
    const { data } = await instance.get(challengesEndpoints.dayGames(dayId));
    return data;
  },

  async markReclamSeen(dayId: number | string, type: "ad" | "paid") {
    const { data } = await instance.post(challengesEndpoints.reclamSeen(dayId), {
      type,
    });
    return data;
  },

  async completeDayGame(challengeDayGameId: number | string, score: number) {
    const { data } = await instance.post(
      challengesEndpoints.completeDayGame(challengeDayGameId),
      { score }
    );
    return data;
  },

  async startDay(dayId: number | string) {
    const { data } = await instance.post(challengesEndpoints.startDay(dayId));
    return data;
  },

  async submitDayScore(dayId: number | string, score: number) {
    const { data } = await instance.post(challengesEndpoints.dayScore(dayId), {
      score,
    });
    return data;
  },

  async completeDay(dayId: number | string, score: number) {
    const { data } = await instance.post(
      challengesEndpoints.completeDay(dayId),
      { score }
    );
    return data;
  },

  async updateDayStatus(
    dayId: number | string,
    payload: { status?: string; score?: number }
  ) {
    const { data } = await instance.patch(
      challengesEndpoints.updateDayStatus(dayId),
      payload
    );
    return data;
  },

  async getChallengeProgress(id: number | string): Promise<ChallengeProgress> {
    const { data } = await instance.get(
      challengesEndpoints.challengeProgress(id)
    );
    return data;
  },

  async getChallengeLeaderboard(
    id: number | string
  ): Promise<ChallengeLeaderboardEntry[]> {
    const { data } = await instance.get(
      challengesEndpoints.challengeLeaderboard(id)
    );
    return data;
  },
};

export { ChallengesModule };
