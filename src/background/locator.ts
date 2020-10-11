import LazyLocatorFactory from "@/services/locator";
import serviceRegistry from "@/services/registry";
import { liftBackground } from "@/background/protocol";
import { isBackgroundPage } from "webext-detect-page";

const locator = new LazyLocatorFactory();

async function initLocator() {
  // Need the service blocks first because it contains the pixiebrix service definition. If we wanted to avoid
  // this, could just load the YAML config directly in the locator factory.
  await serviceRegistry.refresh({ allowFetch: false });
  await locator.refresh();
}

export const locate = liftBackground(
  "LOCATE_SERVICE",
  async (serviceId: string, id: string | null) => {
    return await locator.locate(serviceId, id);
  }
);

if (isBackgroundPage()) {
  initLocator().then(() => {
    console.debug("Eagerly initialized service locator");
  });
}
