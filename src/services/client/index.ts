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

const REQUEST_TIMEOUT_MS = 15000;

const createInstance = (config: AxiosRequestConfig) => {
  const instance = axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT_MS,

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

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.data?.message === "ACCOUNT_BLOCKED") {
        // Lazy require avoids a circular import (store/auth -> auth-module -> this file).
        const { useAuthStore } = require("@/store/auth");
        const { router } = require("expo-router");
        const { Alert } = require("react-native");
        const i18n = require("@/i18n").default;
        useAuthStore.getState().logout();
        router.replace("/(auth)/login");
        Alert.alert(
          i18n.t("auth.common.errorTitle"),
          i18n.t("auth.common.accountBlocked"),
        );
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

export const instance = createInstance({});
