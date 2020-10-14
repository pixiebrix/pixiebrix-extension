/**
 * API for PixieBrix app to talk to the browser extension.
 */
import { AuthData, updateExtensionAuth } from "@/auth/token";
import { openOptions } from "@/chrome";
import { liftBackground } from "@/background/protocol";

export const connectPage = liftBackground("CONNECT_PAGE", async () => {
  return chrome.runtime.getManifest();
});

export const setExtensionAuth = liftBackground(
  "SET_EXTENSION_AUTH",
  async (auth: AuthData) => {
    return await updateExtensionAuth(auth);
  }
);

export const openExtensionOptions = liftBackground("OPEN_OPTIONS", async () => {
  await openOptions();
  return true;
});
