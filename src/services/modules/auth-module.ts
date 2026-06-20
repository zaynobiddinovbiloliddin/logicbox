import { instance } from "../client";
import { authEndpoints } from "../endpoints";

const AuthModule = {
  async authLogin(obj: { username: string; password: string }) {
    const { data } = await instance.post(authEndpoints.authLogin, obj);
    return data;
  },

  async authRegister(obj: {
    username: string;
    password: string;
    name: string;
    deviceId?: string;
  }) {
    const { data } = await instance.post(authEndpoints.authRegister, obj);
    return data;
  },

  async authMe() {
    const { data } = await instance.get(authEndpoints.authMe);
    return data;
  },
};

export { AuthModule };
