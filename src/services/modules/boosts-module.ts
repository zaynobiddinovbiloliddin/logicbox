import { instance } from "../client";
import { boostsEndpoints } from "../endpoints";

const BoostsModule = {
  async getBoosts() {
    const { data } = await instance.get(boostsEndpoints.boosts);
    return data;
  },

  async getBoostById(id: number) {
    const { data } = await instance.get(boostsEndpoints.getBoosts(id));
    return data;
  },

  async buyBoost(id: number, count: number = 1) {
    const { data } = await instance.post(boostsEndpoints.buyBoosts(id), {
      count,
    });
    return data;
  },

  async consumeBoost(userID: number, boostID: number) {
    const { data } = await instance.post(boostsEndpoints.consumeBoost(), {
      userId: userID,
      boostId: boostID,
    });
    return data;
  },

  async getSpinItems() {
    const { data } = await instance.get(boostsEndpoints.spinItems);
    return data;
  },

  async spinWheel() {
    const { data } = await instance.post(boostsEndpoints.spin);
    return data;
  },
};

export { BoostsModule };
