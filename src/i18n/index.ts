import { LANGUAGES } from "@/constants/language";
import { Keys, storage } from "@/store/mmkv";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translationRU from "./locales/ru/translation.json";
import translationUZ from "./locales/uz/translation.json";
import translationUZCyrl from "./locales/uz-Cyrl/translation.json";

const resources = {
  [LANGUAGES.UZ]: { translation: translationUZ },
  [LANGUAGES.UZ_CYRIL]: { translation: translationUZCyrl },
  [LANGUAGES.RU]: { translation: translationRU },
};

i18n.use(initReactI18next).init({
  resources,
  lng: storage.getString(Keys.LANGUAGE) ?? LANGUAGES.UZ,
  fallbackLng: LANGUAGES.UZ,
  interpolation: {
    escapeValue: false,
  },
  initImmediate: false,
});

export default i18n;
