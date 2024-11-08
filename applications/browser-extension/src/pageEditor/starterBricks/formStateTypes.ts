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

import { type ElementInfo } from "../../utils/inference/selectorTypes";
import {
  type ContextMenuConfig,
  type ContextMenuTargetMode,
  type MenuDefaultOptions as ContextMenuDefaultOptions,
} from "../../starterBricks/contextMenu/contextMenuTypes";
import {
  type ButtonStarterBrickConfig,
  type ButtonPosition,
} from "../../starterBricks/button/buttonStarterBrickTypes";
import {
  type QuickBarConfig,
  type QuickBarDefaultOptions,
  type QuickBarTargetMode,
} from "../../starterBricks/quickBar/quickBarTypes";
import {
  type SidebarConfig,
  type Trigger as SidebarTrigger,
} from "../../starterBricks/sidebar/sidebarStarterBrickTypes";
import {
  type AttachMode,
  type ReportMode,
  type TargetMode,
  type Trigger as TriggerTrigger,
} from "../../starterBricks/trigger/triggerStarterBrickTypes";
import {
  type CustomEventOptions,
  type DebounceOptions,
} from "../../starterBricks/types";
import { StarterBrickTypes } from "../../types/starterBrickTypes";
import { type Except } from "type-fest";
import { type Menus } from "webextension-polyfill";
import {
  type DynamicQuickBarConfig,
  type DynamicQuickBarDefaultOptions,
} from "../../starterBricks/dynamicQuickBar/dynamicQuickBarTypes";
import {
  type BaseStarterBrickState,
  type BaseModComponentState,
  type BaseFormState,
  type SingleLayerReaderConfig,
} from "../store/editor/baseFormStateTypes";
import { type NormalizedAvailability } from "../../types/availabilityTypes";
import { type Nullishable } from "../../utils/nullishUtils";

// ButtonFormState
type ButtonModComponentState = BaseModComponentState &
  Except<ButtonStarterBrickConfig, "action">;
type ButtonStarterBrickState = BaseStarterBrickState & {
  definition: {
    type: typeof StarterBrickTypes.BUTTON;
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

export interface ButtonFormState
  extends BaseFormState<ButtonModComponentState, ButtonStarterBrickState> {
  containerInfo: ElementInfo | null;
}

// SidebarFormState
type SidebarModComponentState = BaseModComponentState &
  Except<SidebarConfig, "body">;

type SidebarStarterBrickState = BaseStarterBrickState & {
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

export type SidebarFormState = BaseFormState<
  SidebarModComponentState,
  SidebarStarterBrickState
>;

// TriggerFormState
type TriggerStarterBrickState = BaseStarterBrickState & {
  definition: {
    type: typeof StarterBrickTypes.TRIGGER;
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

export function isTriggerStarterBrick(
  starterBrick: BaseStarterBrickState,
): starterBrick is TriggerStarterBrickState {
  return starterBrick.definition.type === StarterBrickTypes.TRIGGER;
}

export type TriggerFormState = BaseFormState<
  BaseModComponentState,
  TriggerStarterBrickState
>;

// ContextMenuFormState
type ContextMenuModComponentState = BaseModComponentState &
  Except<ContextMenuConfig, "action">;
type ContextMenuStarterBrickState = BaseStarterBrickState & {
  definition: {
    type: typeof StarterBrickTypes.CONTEXT_MENU;
    defaultOptions: ContextMenuDefaultOptions;
    documentUrlPatterns: string[];
    contexts: Menus.ContextType[];
    targetMode: ContextMenuTargetMode;
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export type ContextMenuFormState = BaseFormState<
  ContextMenuModComponentState,
  ContextMenuStarterBrickState
>;

// QuickBarFormState
type QuickBarModComponentState = BaseModComponentState &
  Except<QuickBarConfig, "action">;
type QuickBarStarterBrickState = BaseStarterBrickState & {
  definition: {
    type: typeof StarterBrickTypes.QUICK_BAR_ACTION;
    defaultOptions: QuickBarDefaultOptions;
    documentUrlPatterns: string[];
    contexts: Menus.ContextType[];
    targetMode: QuickBarTargetMode;
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

// DynamicQuickBarFormState
type DynamicQuickBarModComponentState = BaseModComponentState &
  Except<DynamicQuickBarConfig, "generator"> & {
    rootAction?: DynamicQuickBarConfig["rootAction"];
  };
type DynamicQuickBarStarterBrickState = BaseStarterBrickState & {
  definition: {
    type: typeof StarterBrickTypes.DYNAMIC_QUICK_BAR;
    defaultOptions: DynamicQuickBarDefaultOptions;
    documentUrlPatterns: string[];
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export function isQuickBarStarterBrick(
  starterBrick: BaseStarterBrickState,
): starterBrick is QuickBarStarterBrickState {
  return [
    typeof StarterBrickTypes.QUICK_BAR_ACTION,
    typeof StarterBrickTypes.DYNAMIC_QUICK_BAR,
  ].includes(starterBrick.definition.type);
}

export type QuickBarFormState = BaseFormState<
  QuickBarModComponentState,
  QuickBarStarterBrickState
>;

export type DynamicQuickBarFormState = BaseFormState<
  DynamicQuickBarModComponentState,
  DynamicQuickBarStarterBrickState
>;

/**
 * @deprecated We want to deconstruct ComponentFormState and using reducers instead of
 * useEffect/useAsyncEffect for defaulting, cleaning up integration configurations, etc.
 */
export type ModComponentFormState =
  | ButtonFormState
  | TriggerFormState
  | SidebarFormState
  | ContextMenuFormState
  | QuickBarFormState
  | DynamicQuickBarFormState;
