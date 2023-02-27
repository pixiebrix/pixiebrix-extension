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

export type ReportMode =
  // Events (trigger/error) reported only once per extension per page
  | "once"
  // Report all events
  | "all";

export type Trigger =
  // `load` is page load
  | "load"
  // `interval` is a fixed interval
  | "interval"
  // `appear` is triggered when an element enters the user's viewport
  | "appear"
  // `initialize` is triggered when an element is added to the DOM
  | "initialize"
  | "blur"
  | "click"
  | "dblclick"
  | "mouseover"
  // https://ux.stackexchange.com/questions/109288/how-long-in-milliseconds-is-long-enough-to-decide-a-user-is-actually-hovering
  | "hover"
  | "keydown"
  | "keyup"
  | "keypress"
  | "change"
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  | "selectionchange"
  // The PixieBrix page state changed
  | "statechange"
  // A custom event configured by the user. Can also be an external event from the page
  | "custom";

export const KEYBOARD_TRIGGERS: Trigger[] = ["keydown", "keyup", "keypress"];

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
  "click",
  "dblclick",
  "blur",
  "mouseover",
  "hover",
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
