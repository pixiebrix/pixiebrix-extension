import { readStorage } from "@/chrome";
import BaseRegistry from "@/baseRegistry";
import { fromJS } from "@/services/factory";
import { RawServiceConfiguration } from "@/core";

export const PIXIEBRIX_SERVICE_ID = "pixiebrix";

const storageKey = "persist:servicesOptions";

const registry = new BaseRegistry("registry:services", "services", fromJS);

export async function readRawConfigurations(): Promise<
  RawServiceConfiguration[]
> {
  const rawConfigs = await readStorage(storageKey);

  // Not really sure why the next level down is escaped JSON?
  const base = JSON.parse(rawConfigs as string);
  const configured = JSON.parse(base.configured);
  return Array.from(Object.values(configured)) as RawServiceConfiguration[];
}

export default registry;
