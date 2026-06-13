import axios, { AxiosHeaders, AxiosRequestConfig } from "axios";
import Qs from "qs";
import { Keys, storage } from "../../store/mmkv";

const URL = "https://myndlab-production.up.railway.app/api/v1";

const API_CONFIG = {
  PROD: URL,
  IMAGE: "https://myndlab-production.up.railway.app",
};

export const baseURL = API_CONFIG.PROD;
export const imageURL = API_CONFIG.IMAGE;

const createInstance = (config: AxiosRequestConfig) => {
  const instance = axios.create({
    baseURL,

    paramsSerializer: {
      encode: (params) => Qs.stringify(params, { arrayFormat: "brackets" }),
    },
    ...config,
  });

  instance.interceptors.request.use((requestConfig) => {
    try {
      const token = storage.getString(Keys.ACCESS_TOKEN);

      if (token) {
        requestConfig.headers = new AxiosHeaders({
          "Content-Type":
            requestConfig.headers["Content-Type"] || "application/json",
          Authorization: `Bearer ${token}`,
        });
      }

      return requestConfig;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return requestConfig;
    }
  });

  return instance;
};

export const instance = createInstance({});
