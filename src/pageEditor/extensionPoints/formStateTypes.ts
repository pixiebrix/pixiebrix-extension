/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { type NormalizedAvailability } from "@/blocks/types";
import { type ElementInfo } from "@/contentScript/nativeEditor/types";
import {
  type ContextMenuConfig,
  type ContextMenuTargetMode,
  type MenuDefaultOptions as ContextMenuDefaultOptions,
} from "@/extensionPoints/contextMenu";
import {
  type MenuItemExtensionConfig,
  type MenuPosition,
} from "@/extensionPoints/menuItemExtension";
import { type PanelConfig } from "@/extensionPoints/panelExtension";
import {
  type QuickBarConfig,
  type QuickBarDefaultOptions,
  type QuickBarTargetMode,
} from "@/extensionPoints/quickBarExtension";
import {
  type SidebarConfig,
  type Trigger as SidebarTrigger,
} from "@/extensionPoints/sidebarExtension";
import {
  type AttachMode,
  type ReportMode,
  type TargetMode,
  type Trigger as TriggerTrigger,
} from "@/extensionPoints/triggerExtension";
import {
  type CustomEventOptions,
  type DebounceOptions,
  type ExtensionPointType,
} from "@/extensionPoints/types";
import { type Except } from "type-fest";
import { type Menus } from "webextension-polyfill";
import {
  type BaseExtensionState,
  type BaseExtensionPointState,
  type SingleLayerReaderConfig,
  type BaseFormState,
} from "./elementConfig";

// ActionFormState
type ActionExtensionState = BaseExtensionState &
  Except<MenuItemExtensionConfig, "action">;
type ActionExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: ExtensionPointType;
    containerSelector: string;
    position?: MenuPosition;
    template: string;
    /**
     * @since 1.7.16
     */
    targetMode?: "document" | "eventTarget";
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
  traits?: {
    style: {
      mode: "default" | "inherit";
    };
  };
};

export interface ActionFormState
  extends BaseFormState<ActionExtensionState, ActionExtensionPointState> {
  type: "menuItem";
  containerInfo: ElementInfo;
}

// SidebarFormState
type SidebarExtensionState = BaseExtensionState & Except<SidebarConfig, "body">;

export type SidebarExtensionPointState = BaseExtensionPointState & {
  definition: BaseExtensionPointState["definition"] & {
    /**
     * Sidebar trigger (default="load")
     * @since 1.6.5
     */
    trigger: SidebarTrigger;

    /**
     * Debouncing props
     * @since 1.6.5
     */
    debounce: DebounceOptions | null;

    /**
     * Custom trigger props
     * @since 1.6.5
     */
    customEvent: CustomEventOptions | null;
  };
};

export interface SidebarFormState
  extends BaseFormState<SidebarExtensionState, SidebarExtensionPointState> {
  type: "actionPanel";
}

// TriggerFormState
export type TriggerExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: ExtensionPointType;
    rootSelector: string | null;
    trigger: TriggerTrigger;
    reader: SingleLayerReaderConfig;
    attachMode: AttachMode;
    targetMode: TargetMode;
    reportMode: ReportMode;

    isAvailable: NormalizedAvailability;

    // Debouncing props
    debounce: DebounceOptions;

    // Custom tigger props
    customEvent: CustomEventOptions;

    // Interval props
    intervalMillis: number | null;
    background: boolean | null;
  };
};

export function isTriggerExtensionPoint(
  extensionPoint: BaseExtensionPointState
): extensionPoint is TriggerExtensionPointState {
  return extensionPoint.definition.type === "trigger";
}

export interface TriggerFormState
  extends BaseFormState<BaseExtensionState, TriggerExtensionPointState> {
  type: "trigger";
}

// PanelFormState
export type PanelTraits = {
  style: {
    mode: "default" | "inherit";
  };
};

type PanelExtensionState = BaseExtensionState & Except<PanelConfig, "body">;
type PanelExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: ExtensionPointType;
    containerSelector: string;
    position?: MenuPosition;
    template: string;
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
  traits: PanelTraits;
};

export interface PanelFormState
  extends BaseFormState<PanelExtensionState, PanelExtensionPointState> {
  type: "panel";

  containerInfo: ElementInfo;
}

// ContextMenuFormState
type ContextMenuExtensionState = BaseExtensionState &
  Except<ContextMenuConfig, "action">;
type ContextMenuExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: ExtensionPointType;
    defaultOptions: ContextMenuDefaultOptions;
    documentUrlPatterns: string[];
    contexts: Menus.ContextType[];
    targetMode: ContextMenuTargetMode;
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export interface ContextMenuFormState
  extends BaseFormState<
    ContextMenuExtensionState,
    ContextMenuExtensionPointState
  > {
  type: "contextMenu";
}

// QuickBarFormState
type QuickBarExtensionState = BaseExtensionState &
  Except<QuickBarConfig, "action">;
type QuickBarExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: ExtensionPointType;
    defaultOptions: QuickBarDefaultOptions;
    documentUrlPatterns: string[];
    contexts: Menus.ContextType[];
    targetMode: QuickBarTargetMode;
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export function isQuickBarExtensionPoint(
  extensionPoint: BaseExtensionPointState
): extensionPoint is QuickBarExtensionPointState {
  return extensionPoint.definition.type === "quickBar";
}

export interface QuickBarFormState
  extends BaseFormState<QuickBarExtensionState, QuickBarExtensionPointState> {
  type: "quickBar";
}

export type FormState =
  | ActionFormState
  | SidebarFormState
  | TriggerFormState
  | PanelFormState
  | ContextMenuFormState
  | QuickBarFormState;
