import sortBy from "lodash/sortBy";
import { fromJS } from "@/extensionPoints/factory";
import BaseRegistry from "@/baseRegistry";
import { IExtensionPoint, IOption } from "@/core";

const registry = new BaseRegistry<IExtensionPoint>(
  "registry:extensionPoints",
  "extension-points",
  fromJS
);

export interface ExtensionPointOption extends IOption {
  extensionPoint: IExtensionPoint;
}

export async function getExtensionPointOptions(): Promise<
  ExtensionPointOption[]
> {
  return sortBy(registry.all(), (x) => x.name).map((x) => ({
    value: x.id,
    label: x.name,
    extensionPoint: x,
  }));
}

export default registry;
