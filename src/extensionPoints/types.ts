import { Metadata } from "@/core";
import { ReaderConfig } from "@/blocks/combinators";
import { Availability } from "@/blocks/types";

type ExtensionPointType = "panel" | "menuItem" | "trigger";

export interface ExtensionPointDefinition {
  type: ExtensionPointType;
  isAvailable: Availability;
  reader: ReaderConfig;
}

export interface ExtensionPointConfig<
  T extends ExtensionPointDefinition = ExtensionPointDefinition
> {
  metadata: Metadata;
  definition: T;
  kind: "extensionPoint";
}
