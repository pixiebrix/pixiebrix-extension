import { fromJS as deserializePanel } from "@/extensionPoints/panelExtension";
import { fromJS as deserializeMenuItem } from "@/extensionPoints/menuItemExtension";
import { IExtensionPoint } from "@/core";
import { ExtensionPointConfig } from "@/extensionPoints/types";

const TYPE_MAP = {
  panel: deserializePanel,
  menuItem: deserializeMenuItem,
};

export function fromJS(config: ExtensionPointConfig): IExtensionPoint {
  if (config.kind !== "extensionPoint") {
    throw new Error(`Expected kind extensionPoint, got ${config.kind}`);
  }

  if (
    config.definition.type !== "panel" &&
    config.definition.type !== "menuItem"
  ) {
    throw new Error(
      `Expected panel or menuItem, got ${config.definition.type}`
    );
  }

  return TYPE_MAP[config.definition.type](config as any);
}
