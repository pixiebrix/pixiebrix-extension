/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type ElementInfo } from "@/utils/inference/selectorTypes";
import {
  type ContextMenuConfig,
  type ContextMenuTargetMode,
  type MenuDefaultOptions as ContextMenuDefaultOptions,
} from "@/starterBricks/contextMenu/contextMenuTypes";
import {
  type ButtonStarterBrickConfig,
  type ButtonPosition,
} from "@/starterBricks/button/buttonStarterBrickTypes";
import { type PanelConfig } from "@/starterBricks/panel/panelStarterBrickTypes";
import {
  type QuickBarConfig,
  type QuickBarDefaultOptions,
  type QuickBarTargetMode,
} from "@/starterBricks/quickBar/quickBarTypes";
import {
  type SidebarConfig,
  type Trigger as SidebarTrigger,
} from "@/starterBricks/sidebar/sidebarStarterBrickTypes";
import {
  type AttachMode,
  type ReportMode,
  type TargetMode,
  type Trigger as TriggerTrigger,
} from "@/starterBricks/trigger/triggerStarterBrickTypes";
import {
  type CustomEventOptions,
  type DebounceOptions,
} from "@/starterBricks/types";
import {
  type StarterBrickType,
  type StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { type Except } from "type-fest";
import { type Menus } from "webextension-polyfill";
import {
  type QuickBarProviderConfig,
  type QuickBarProviderDefaultOptions,
} from "@/starterBricks/quickBarProvider/quickBarProviderTypes";
import { type TourDefinition } from "@/starterBricks/tour/tourTypes";
import {
  type BaseStarterBrickState,
  type BaseModComponentState,
  type BaseFormState,
  type SingleLayerReaderConfig,
} from "@/pageEditor/baseFormStateTypes";
import { type NormalizedAvailability } from "@/types/availabilityTypes";
import { type Nullishable } from "@/utils/nullishUtils";

// ActionFormState
type ActionExtensionState = BaseModComponentState &
  Except<ButtonStarterBrickConfig, "action">;
type ActionExtensionPointState = BaseStarterBrickState & {
  definition: {
    type: StarterBrickType;
    containerSelector: string;
    position?: ButtonPosition;
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
  type: typeof StarterBrickTypes.BUTTON;
  containerInfo: ElementInfo | null;
}

// SidebarFormState
type SidebarExtensionState = BaseModComponentState &
  Except<SidebarConfig, "body">;

type SidebarExtensionPointState = BaseStarterBrickState & {
  definition: BaseStarterBrickState["definition"] & {
    /**
     * Sidebar trigger (default="load")
     * @since 1.6.5
     */
    trigger: SidebarTrigger;

    /**
     * Debouncing props
     * @since 1.6.5
     */
    debounce: Nullishable<DebounceOptions>;

    /**
     * Custom trigger props
     * @since 1.6.5
     */
    customEvent: Nullishable<CustomEventOptions>;
  };
};

export interface SidebarFormState
  extends BaseFormState<SidebarExtensionState, SidebarExtensionPointState> {
  type: "actionPanel";
}

// TriggerFormState
type TriggerExtensionPointState = BaseStarterBrickState & {
  definition: {
    type: StarterBrickType;
    rootSelector?: string;
    trigger?: TriggerTrigger;
    reader: SingleLayerReaderConfig;
    attachMode?: AttachMode;
    targetMode?: TargetMode;
    reportMode?: ReportMode;
    /**
     * @since 1.7.34
     */
    showErrors?: boolean;

    isAvailable: NormalizedAvailability;

    // Debouncing props
    debounce?: DebounceOptions;

    // Custom tigger props
    customEvent?: CustomEventOptions;

    // Interval props
    intervalMillis?: number;
    background?: boolean;
  };
};

export function isTriggerExtensionPoint(
  extensionPoint: BaseStarterBrickState,
): extensionPoint is TriggerExtensionPointState {
  return extensionPoint.definition.type === "trigger";
}

export interface TriggerFormState
  extends BaseFormState<BaseModComponentState, TriggerExtensionPointState> {
  type: "trigger";
}

// PanelFormState
export type PanelTraits = {
  style: {
    mode: "default" | "inherit";
  };
};

type PanelExtensionState = BaseModComponentState & Except<PanelConfig, "body">;
type PanelExtensionPointState = BaseStarterBrickState & {
  definition: {
    type: StarterBrickType;
    containerSelector: string;
    position?: ButtonPosition;
    template: string;
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
  traits: PanelTraits;
};

export interface PanelFormState
  extends BaseFormState<PanelExtensionState, PanelExtensionPointState> {
  type: "panel";

  containerInfo: ElementInfo | null;
}

// ContextMenuFormState
type ContextMenuExtensionState = BaseModComponentState &
  Except<ContextMenuConfig, "action">;
type ContextMenuExtensionPointState = BaseStarterBrickState & {
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
type QuickBarExtensionState = BaseModComponentState &
  Except<QuickBarConfig, "action">;
type QuickBarExtensionPointState = BaseStarterBrickState & {
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
type QuickBarProviderExtensionState = BaseModComponentState &
  Except<QuickBarProviderConfig, "generator"> & {
    rootAction?: QuickBarProviderConfig["rootAction"];
  };
type QuickBarProviderExtensionPointState = BaseStarterBrickState & {
  definition: {
    type: StarterBrickType;
    defaultOptions: QuickBarProviderDefaultOptions;
    documentUrlPatterns: string[];
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export function isQuickBarExtensionPoint(
  extensionPoint: BaseStarterBrickState,
): extensionPoint is QuickBarExtensionPointState {
  return ["quickBar", "quickBarProvider"].includes(
    extensionPoint.definition.type,
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
type TourExtensionPointState = BaseStarterBrickState & {
  definition: {
    type: StarterBrickType;
    isAvailable: NormalizedAvailability;
    allowUserRun?: TourDefinition["allowUserRun"];
    autoRunSchedule?: TourDefinition["autoRunSchedule"];
  };
};

export interface TourFormState
  extends BaseFormState<BaseModComponentState, TourExtensionPointState> {
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
