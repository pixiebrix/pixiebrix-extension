import { readStorage } from "@/chrome";
import { ExtensionPointConfig } from "@/extensionPoints/types";

const storageKey = "persist:extensionOptions";

export async function loadOptions(): Promise<{
  extensions: ExtensionPointConfig[];
}> {
  const rawOptions = await readStorage(storageKey);

  // Not really sure why the next level down is escaped JSON?
  const base = JSON.parse(rawOptions as string);
  return { extensions: JSON.parse(base.extensions) };
}
