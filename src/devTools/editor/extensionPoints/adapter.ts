import { ElementType, FormState } from "@/devTools/editor/editorSlice";
import { IExtension } from "@/core";
import { find as findBrick } from "@/registry/localRegistry";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { DynamicDefinition } from "@/nativeEditor";
import * as menuExtension from "@/devTools/editor/extensionPoints/menuItem";
import * as triggerExtension from "@/devTools/editor/extensionPoints/trigger";
import * as panelExtension from "@/devTools/editor/extensionPoints/panel";
import * as contextExtension from "@/devTools/editor/extensionPoints/contextMenu";

interface Config<TFormState extends FormState = FormState> {
  definition: (element: TFormState) => DynamicDefinition;
  extensionPoint: (element: TFormState) => ExtensionPointConfig;
  extension: (element: TFormState) => IExtension;
  formState: (extension: IExtension) => Promise<TFormState>;
}

export const ADAPTERS = new Map<ElementType, Config>(
  Object.entries({
    menuItem: {
      definition: menuExtension.makeActionConfig,
      extensionPoint: menuExtension.makeMenuExtensionPoint,
      extension: menuExtension.makeActionExtension,
      formState: menuExtension.makeActionFormState,
    },
    trigger: {
      definition: triggerExtension.makeTriggerConfig,
      extensionPoint: triggerExtension.makeTriggerExtensionPoint,
      extension: triggerExtension.makeTriggerExtension,
      formState: triggerExtension.makeTriggerFormState,
    },
    panel: {
      definition: panelExtension.makePanelConfig,
      extensionPoint: panelExtension.makePanelExtensionPoint,
      extension: panelExtension.makePanelExtension,
      formState: undefined,
    },
    contextMenu: {
      definition: contextExtension.makeContextMenuConfig,
      extensionPoint: contextExtension.makeContextMenuExtensionPoint,
      extension: contextExtension.makeContextMenuExtension,
      formState: contextExtension.makeContextMenuFormState,
    },
  }) as [ElementType, Config][]
);

export async function getType(extension: IExtension): Promise<ElementType> {
  const brick = await findBrick(extension.extensionPointId);
  if (!brick) {
    console.exception("Cannot find extension point", {
      extensionPointId: extension.extensionPointId,
    });
    throw new Error(`Cannot find extension point`);
  }
  const extensionPoint = (brick.config as unknown) as ExtensionPointConfig;
  return extensionPoint.definition.type;
}

export async function extensionToFormState(
  extension: IExtension
): Promise<FormState> {
  const type = await getType(extension);
  const { formState } = ADAPTERS.get(type);
  if (!formState) {
    throw new Error(
      `Editing existing extensions of type '${type}' not implemented`
    );
  }
  return await formState(extension);
}
