import { instance } from "../client";
import { reaclamsEndpoints } from "../endpoints";

const ReaclamsModule = {
  async getReaclams() {
    const { data } = await instance.get(reaclamsEndpoints.reaclams);
    return data;
  },
};

export { ReaclamsModule };
