import { FormState } from "@/devTools/editor/editorSlice";
import { IExtension } from "@/core";
import { find as findBrick } from "@/registry/localRegistry";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { MenuItemExtensionConfig } from "@/extensionPoints/menuItemExtension";
import { makeActionFormState } from "@/devTools/editor/extensionPoints/menuItem";

export async function getType(extension: IExtension): Promise<string> {
  const extensionPoint = ((await findBrick(extension.extensionPointId))
    .config as unknown) as ExtensionPointConfig;
  return extensionPoint.definition.type;
}

export async function extensionToFormState(
  extension: IExtension
): Promise<FormState> {
  const extensionPoint = ((await findBrick(extension.extensionPointId))
    .config as unknown) as ExtensionPointConfig;
  switch (extensionPoint.definition.type) {
    case "menuItem":
      return await makeActionFormState(
        extension as IExtension<MenuItemExtensionConfig>
      );
    default:
      throw new Error(
        `Editing existing extensions of type '${extensionPoint.definition.type}' not implemented`
      );
  }
}
