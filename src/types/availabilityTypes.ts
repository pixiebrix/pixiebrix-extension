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

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
 * @since 1.4.10
 */
type URLPattern = string | URLPatternInit;

/**
 * An availability rule. For a rule to match, there must be match from each of the provided entries.
 *
 * An empty value (null, empty array, etc.) matches any site.
 *
 * @see checkAvailable
 */
export type Availability = {
  /**
   * Used to request permissions from the browser.
   *
   * See https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns for valid match patterns.
   */
  matchPatterns?: string | string[];
  /**
   * NOTE: the urlPatterns must be a subset of matchPatterns (i.e., more restrictive). If not, PixieBrix may not have
   * access to the page
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
   * @since 1.4.10
   */
  urlPatterns?: URLPattern | URLPattern[];
  /**
   * A selector that must be available on the page in order for the extension to be run.
   *
   * NOTE: the selector must be available at the time the contentScript is installed. While the contentScript is loaded
   * on document_idle, for SPAs this may lead to races between the selector check and rendering of the front-end.
   */
  selectors?: string | string[];
  /**
   * True to run in all frames vs. only the top-level frame if the starter brick supports frames. Defaults to true for
   * backward compatability.
   *
   * Ignored for starter bricks that can only run in the top-level frame (e.g., Quick Bar and Sidebar Panel).
   *
   * Similar to all_frames in https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts, but
   * the mod component does not to be running in the top-level frame for it to run in a sub-frame.
   *
   * @since 2.0.2
   */
  allFrames?: boolean;
};

/**
 * Availability with consistent shape (i.e., all fields provided arrays).
 * @see Availability
 */
export type NormalizedAvailability = {
  /**
   * Used to request permissions from the browser.
   *
   * See https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns for valid match patterns.
   */
  matchPatterns: string[];
  /**
   * NOTE: the urlPatterns must be a subset of matchPatterns (i.e., more restrictive). If not, PixieBrix may not have
   * access to the page
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
   * @since 1.4.10
   */
  urlPatterns: URLPattern[];
  /**
   * A selector that must be available on the page in order for the extension to be run.
   *
   * NOTE: the selector must be available at the time the contentScript is installed. While the contentScript is loaded
   * on document_idle, for SPAs this may lead to races between the selector check and rendering of the front-end.
   */
  selectors: string[];
  /**
   * True to run in all frames vs. only the top-level frame if the starter brick supports frames.
   *
   * Ignored for starter bricks that can only run in the top-level frame (e.g., Quick Bar and Sidebar Panel).
   *
   * Similar to all_frames in https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts, but
   * the mod component does not to be running in the top-level frame for it to run in a sub-frame.
   *
   * @since 2.0.2
   */
  allFrames: boolean;
};
