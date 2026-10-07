declare const process: {
  env: {
    EXPO_PUBLIC_DATABASE_API_URL?: string;
    EXPO_PUBLIC_DATABASE_USER_ID?: string;
  };
};

const configuredApiUrl = process.env.EXPO_PUBLIC_DATABASE_API_URL?.trim() ?? "";
const defaultLocalApiUrl = "http://127.0.0.1:3000/api";
const hasValidConfiguredUrl = /^https?:\/\//i.test(configuredApiUrl);

export const API_BASE_URL = hasValidConfiguredUrl
  ? configuredApiUrl.replace(/\/$/, "")
  : defaultLocalApiUrl;

export const API_USER_ID =
  process.env.EXPO_PUBLIC_DATABASE_USER_ID?.trim() || "default-user";

export const isApiConfigured = hasValidConfiguredUrl;
