import { readStorage, setStorage } from "@/chrome";
import equal from "deep-equal";

const STORAGE_EXTENSION_KEY = "extensionKey";

interface UserData {
  email?: string;
  user?: string;
  hostname?: string;
}

interface AuthData extends UserData {
  token: string;
}

export function readAuthFromWebsite(): AuthData {
  const container = document.getElementById("container");
  const { token, email, user } = container.dataset;
  return { token, email, user, hostname: location.hostname };
}

export async function getExtensionToken(): Promise<string> {
  const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
  return JSON.parse(valueJSON as string).token;
}

export async function getExtensionAuth(): Promise<UserData> {
  const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
  const { user, email, hostname } = JSON.parse(valueJSON as string);
  return { user, email, hostname };
}

/**
 * Refresh the Chrome extensions auth (user, email, token, hostname), and return true iff it was updated.
 */
export async function updateExtensionAuth(auth: AuthData): Promise<boolean> {
  if (auth) {
    let previous;
    try {
      const valueJSON = await readStorage(STORAGE_EXTENSION_KEY);
      previous = JSON.parse(valueJSON as string);
    } catch {
      // pass
    }
    await setStorage(STORAGE_EXTENSION_KEY, JSON.stringify(auth));
    return !equal(auth, previous);
  }
  return false;
}
