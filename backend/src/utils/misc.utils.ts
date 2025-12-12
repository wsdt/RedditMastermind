import { TYPED_ENV } from "./env.utils";

export const API_VERSION = "1";
export const IS_DEV_MODE =
    TYPED_ENV.NODE_ENV?.toLowerCase()?.trim() === "development";

export const BE_ENDPOINT = IS_DEV_MODE
    ? `http://localhost:${TYPED_ENV.BE_PORT}`
    : "https://api.redditmastermind.com"; // @dev shoudl we happen to deploy this
