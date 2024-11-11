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

import { type ValueOf } from "type-fest";

export type AttachMode =
  // Attach handlers once (for any elements available at the time of attaching handlers) (default)
  | "once"
  // Watch for new elements and attach triggers to any new elements that matches the selector. Only supports native
  // CSS selectors (because it uses MutationObserver under the hood)
  | "watch";

export type TargetMode =
  // The element that triggered the event
  // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
  | "eventTarget"
  // The element the trigger is attached to
  | "root";

export const ReportModes = {
  // Events (trigger/error) reported only once per mod component per page
  ONCE: "once",
  // Only errors are reported once per mod component per page
  ERROR_ONCE: "error-once",
  // Never reports events
  NEVER: "never",
  // Report all events
  ALL: "all",
} as const;

/**
 * The report mode. Used to prevent repeat events (e.g., interval triggers) from flooding telemetry.
 */
export type ReportMode = ValueOf<typeof ReportModes>;

export const Triggers = {
  // `load` is page load
  LOAD: "load",
  // `interval` is a fixed interval
  INTERVAL: "interval",
  // `appear` is triggered when an element enters the user's viewport
  APPEAR: "appear",
  // `initialize` is triggered when an element is added to the DOM
  INITIALIZE: "initialize",
  BLUR: "blur",
  CLICK: "click",
  DOUBLE_CLICK: "dblclick",
  MOUSEOVER: "mouseover",
  // https://ux.stackexchange.com/questions/109288/how-long-in-milliseconds-is-long-enough-to-decide-a-user-is-actually-hovering
  HOVER: "hover",
  KEYDOWN: "keydown",
  KEYUP: "keyup",
  KEYPRESS: "keypress",
  CHANGE: "change",
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  SELECTION_CHANGE: "selectionchange",
  // The PixieBrix page state changed
  STATE_CHANGE: "statechange",
  // A custom event configured by the user. Can also be an external event from the page
  CUSTOM: "custom",
} as const;

export type Trigger = ValueOf<typeof Triggers>;

export const KEYBOARD_TRIGGERS: Trigger[] = [
  Triggers.KEYDOWN,
  Triggers.KEYUP,
  Triggers.KEYPRESS,
];

/**
 * Triggers considered user actions for the purpose of defaulting the reportMode if not provided.
 *
 * Currently, includes mouse events and input blur. Keyboard events, e.g., "keydown", are not included because single
 * key events do not convey user intent.
 *
 * @see ReportMode
 * @see getDefaultReportModeForTrigger
 */
export const USER_ACTION_TRIGGERS: Trigger[] = [
  Triggers.CLICK,
  Triggers.DOUBLE_CLICK,
  Triggers.BLUR,
  Triggers.MOUSEOVER,
  Triggers.HOVER,
];

export type IntervalArgs = {
  /**
   * Interval in milliseconds.
   */
  intervalMillis: number;

  /**
   * Effect to run on each interval.
   */
  effectGenerator: () => Promise<void>;

  /**
   * AbortSignal to cancel the interval
   */
  signal: AbortSignal;

  /**
   * Request an animation frame so that animation effects (e.g., confetti) don't pile up while the user is not
   * using the tab/frame running the interval.
   */
  requestAnimationFrame: boolean;
};
