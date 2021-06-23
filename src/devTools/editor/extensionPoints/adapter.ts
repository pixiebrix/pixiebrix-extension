import { ElementType, FormState } from "@/devTools/editor/editorSlice";
import { IExtension, Metadata } from "@/core";
import { find as findBrick } from "@/registry/localRegistry";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { DynamicDefinition } from "@/nativeEditor";
import * as menuExtension from "@/devTools/editor/extensionPoints/menuItem";
import * as triggerExtension from "@/devTools/editor/extensionPoints/trigger";
import * as panelExtension from "@/devTools/editor/extensionPoints/panel";
import * as contextExtension from "@/devTools/editor/extensionPoints/contextMenu";
import * as actionPanelExtension from "@/devTools/editor/extensionPoints/actionPanel";
import * as nativeOperations from "@/background/devtools";
import { FrameworkMeta } from "@/messaging/constants";
import * as actionPanel from "@/devTools/editor/extensionPoints/actionPanel";
import { Runtime } from "webextension-polyfill-ts";
import {
  faBars,
  faBolt,
  faColumns,
  faMousePointer,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

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
    actionPanel: {
      definition: actionPanelExtension.makeActionPanelConfig,
      extensionPoint: actionPanelExtension.makeActionPanelExtensionPoint,
      extension: actionPanelExtension.makeActionPanelExtension,
      formState: actionPanelExtension.makeActionPanelFormState,
    },
    panel: {
      definition: panelExtension.makePanelConfig,
      extensionPoint: panelExtension.makePanelExtensionPoint,
      extension: panelExtension.makePanelExtension,
      formState: panelExtension.makePanelFormState,
    },
    contextMenu: {
      definition: contextExtension.makeContextMenuConfig,
      extensionPoint: contextExtension.makeContextMenuExtensionPoint,
      extension: contextExtension.makeContextMenuExtension,
      formState: contextExtension.makeContextMenuFormState,
    },
  }) as [ElementType, Config][]
);

export interface ElementConfig<
  TResult = unknown,
  TState extends FormState = FormState
> {
  elementType: ElementType;
  preview?: boolean;
  label: string;
  icon: IconProp;
  beta?: boolean;
  flag?: string;
  insert: (port: Runtime.Port) => Promise<TResult>;
  makeState: (
    url: string,
    metadata: Metadata,
    element: TResult,
    frameworks: FrameworkMeta[]
  ) => TState;
  makeConfig: (state: TState) => DynamicDefinition;
  makeFromExtensionPoint?: (
    url: string,
    config: ExtensionPointConfig
  ) => Promise<TState>;
}

export const ICON_MAP = new Map([
  ["menuItem", faMousePointer],
  ["panel", faWindowMaximize],
  ["actionPanel", faColumns],
  ["trigger", faBolt],
  ["contextMenu", faBars],
]);

export const ELEMENT_DEFINITIONS: Record<string, ElementConfig> = {
  button: {
    elementType: "menuItem",
    label: "Button",
    icon: faMousePointer,
    insert: nativeOperations.insertButton,
    makeState: menuExtension.makeActionState,
    makeConfig: menuExtension.makeActionConfig,
  },
  contextMenu: {
    elementType: "contextMenu",
    label: "Context Menu",
    insert: undefined,
    icon: faBars,
    makeState: (
      url: string,
      metadata: Metadata,
      element: unknown,
      frameworks: FrameworkMeta[]
    ) => contextExtension.makeContextMenuState(url, metadata, frameworks),
    makeConfig: contextExtension.makeContextMenuConfig,
  },
  panel: {
    elementType: "panel",
    label: "Panel",
    icon: faWindowMaximize,
    insert: nativeOperations.insertPanel,
    makeState: panelExtension.makePanelState,
    makeConfig: panelExtension.makePanelConfig,
    preview: true,
    makeFromExtensionPoint: panelExtension.makePanelExtensionFormState,
  },
  actionPanel: {
    elementType: "actionPanel",
    label: "Sidebar",
    insert: undefined,
    icon: faColumns,
    makeState: actionPanel.makeActionPanelState,
    makeConfig: actionPanel.makeActionPanelConfig,
    preview: true,
    makeFromExtensionPoint: actionPanel.makeActionPanelExtensionFormState,
  },
  trigger: {
    elementType: "trigger",
    label: "Trigger",
    insert: undefined,
    preview: true,
    icon: faBolt,
    makeState: (
      url: string,
      metadata: Metadata,
      element: unknown,
      frameworks: FrameworkMeta[]
    ) => triggerExtension.makeTriggerState(url, metadata, frameworks),
    makeConfig: triggerExtension.makeTriggerConfig,
  },
};

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
  return formState(extension);
}
