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
import {
  type BaseStarterBrickState,
  type BaseModComponentState,
  type BaseFormState,
  type SingleLayerReaderConfig,
} from "@/pageEditor/baseFormStateTypes";
import { type NormalizedAvailability } from "@/types/availabilityTypes";
import { type Nullishable } from "@/utils/nullishUtils";

// ButtonFormState
type ButtonModComponentState = BaseModComponentState &
  Except<ButtonStarterBrickConfig, "action">;
type ButtonStarterBrickState = BaseStarterBrickState & {
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

export interface ButtonFormState
  extends BaseFormState<ButtonModComponentState, ButtonStarterBrickState> {
  type: typeof StarterBrickTypes.BUTTON;
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

export interface SidebarFormState
  extends BaseFormState<SidebarModComponentState, SidebarStarterBrickState> {
  type: "actionPanel";
}

// TriggerFormState
type TriggerStarterBrickState = BaseStarterBrickState & {
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

export function isTriggerStarterBrick(
  starterBrick: BaseStarterBrickState,
): starterBrick is TriggerStarterBrickState {
  return starterBrick.definition.type === "trigger";
}

export interface TriggerFormState
  extends BaseFormState<BaseModComponentState, TriggerStarterBrickState> {
  type: "trigger";
}

// ContextMenuFormState
type ContextMenuModComponentState = BaseModComponentState &
  Except<ContextMenuConfig, "action">;
type ContextMenuStarterBrickState = BaseStarterBrickState & {
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
    ContextMenuModComponentState,
    ContextMenuStarterBrickState
  > {
  type: "contextMenu";
}

// QuickBarFormState
type QuickBarModComponentState = BaseModComponentState &
  Except<QuickBarConfig, "action">;
type QuickBarStarterBrickState = BaseStarterBrickState & {
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
type QuickBarProviderModComponentState = BaseModComponentState &
  Except<QuickBarProviderConfig, "generator"> & {
    rootAction?: QuickBarProviderConfig["rootAction"];
  };
type QuickBarProviderStarterBrickState = BaseStarterBrickState & {
  definition: {
    type: StarterBrickType;
    defaultOptions: QuickBarProviderDefaultOptions;
    documentUrlPatterns: string[];
    reader: SingleLayerReaderConfig;
    isAvailable: NormalizedAvailability;
  };
};

export function isQuickBarStarterBrick(
  starterBrick: BaseStarterBrickState,
): starterBrick is QuickBarStarterBrickState {
  return ["quickBar", "quickBarProvider"].includes(
    starterBrick.definition.type,
  );
}

export interface QuickBarFormState
  extends BaseFormState<QuickBarModComponentState, QuickBarStarterBrickState> {
  type: "quickBar";
}

export interface QuickBarProviderFormState
  extends BaseFormState<
    QuickBarProviderModComponentState,
    QuickBarProviderStarterBrickState
  > {
  type: "quickBarProvider";
}

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
  | QuickBarProviderFormState;
