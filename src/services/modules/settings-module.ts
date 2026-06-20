import { instance } from "../client";
import { settingsEndpoints } from "../endpoints";

const SettingsModule = {
  async getPrizePool(): Promise<{ value: number }> {
    const { data } = await instance.get(settingsEndpoints.prizePool);
    return data;
  },
};

export { SettingsModule };
