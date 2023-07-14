/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type ElementInfo } from "@/pageScript/frameworks";
import {
  type ContextMenuConfig,
  type ContextMenuTargetMode,
  type MenuDefaultOptions as ContextMenuDefaultOptions,
} from "@/starterBricks/contextMenu";
import {
  type MenuItemStarterBrickConfig,
  type MenuPosition,
} from "@/starterBricks/menuItemExtension";
import { type PanelConfig } from "@/starterBricks/panelExtension";
import {
  type QuickBarConfig,
  type QuickBarDefaultOptions,
  type QuickBarTargetMode,
} from "@/starterBricks/quickBarExtension";
import {
  type SidebarConfig,
  type Trigger as SidebarTrigger,
} from "@/starterBricks/sidebarExtension";
import {
  type AttachMode,
  type ReportMode,
  type TargetMode,
  type Trigger as TriggerTrigger,
} from "@/starterBricks/triggerExtensionTypes";
import {
  type CustomEventOptions,
  type DebounceOptions,
  type StarterBrickType,
} from "@/starterBricks/types";
import { type Except } from "type-fest";
import { type Menus } from "webextension-polyfill";
import {
  type BaseExtensionState,
  type BaseExtensionPointState,
  type SingleLayerReaderConfig,
  type BaseFormState,
} from "./elementConfig";
import {
  type QuickBarProviderConfig,
  type QuickBarProviderDefaultOptions,
} from "@/starterBricks/quickBarProviderExtension";
import { type TourDefinition } from "@/starterBricks/tourExtension";

// ActionFormState
type ActionExtensionState = BaseExtensionState &
  Except<MenuItemStarterBrickConfig, "action">;
type ActionExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: StarterBrickType;
    containerSelector: string;
    position?: MenuPosition;
    template: string;
    /**
     * @since 1.7.16
     */
    targetMode?: "document" | "eventTarget";
    /**
     * @since 1.7.28
     */
    attachMode?: "once" | "watch";
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

type SidebarExtensionPointState = BaseExtensionPointState & {
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
type TriggerExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: StarterBrickType;
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
    type: StarterBrickType;
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
    type: StarterBrickType;
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
    type: StarterBrickType;
    defaultOptions: QuickBarDefaultOptions;
    documentUrlPatterns: string[];
    contexts: Menus.ContextType[];
    targetMode: QuickBarTargetMode;
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

// QuickBarFormState
type QuickBarProviderExtensionState = BaseExtensionState &
  Except<QuickBarProviderConfig, "generator"> & {
    rootAction?: QuickBarProviderConfig["rootAction"];
  };
type QuickBarProviderExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: StarterBrickType;
    defaultOptions: QuickBarProviderDefaultOptions;
    documentUrlPatterns: string[];
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export function isQuickBarExtensionPoint(
  extensionPoint: BaseExtensionPointState
): extensionPoint is QuickBarExtensionPointState {
  return ["quickBar", "quickBarProvider"].includes(
    extensionPoint.definition.type
  );
}

export interface QuickBarFormState
  extends BaseFormState<QuickBarExtensionState, QuickBarExtensionPointState> {
  type: "quickBar";
}

export interface QuickBarProviderFormState
  extends BaseFormState<
    QuickBarProviderExtensionState,
    QuickBarProviderExtensionPointState
  > {
  type: "quickBarProvider";
}

// TourFormState
type TourExtensionPointState = BaseExtensionPointState & {
  definition: {
    type: StarterBrickType;
    isAvailable: NormalizedAvailability;
    allowUserRun?: TourDefinition["allowUserRun"];
    autoRunSchedule?: TourDefinition["autoRunSchedule"];
  };
};

export interface TourFormState
  extends BaseFormState<BaseExtensionState, TourExtensionPointState> {
  type: "tour";
}

/**
 * @deprecated We want to deconstruct ComponentFormState and using reducers instead of
 * useEffect/useAsyncEffect for defaulting, cleaning up integration configurations, etc.
 */
export type ModComponentFormState =
  | ActionFormState
  | TriggerFormState
  | SidebarFormState
  | PanelFormState
  | ContextMenuFormState
  | QuickBarFormState
  | QuickBarProviderFormState
  | TourFormState;

export function isModComponentFormState(
  formState: unknown
): formState is ModComponentFormState {
  if (
    typeof formState !== "object" ||
    formState === null ||
    Array.isArray(formState)
  ) {
    return false;
  }

  return (
    "uuid" in formState &&
    "type" in formState &&
    "extensionPoint" in formState &&
    "extension" in formState
  );
}
