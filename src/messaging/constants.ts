/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export const SEARCH_WINDOW = "@@pixiebrix/SEARCH_WINDOW";
export const READ_WINDOW = "@@pixiebrix/READ_WINDOW";
export const READ_ANGULAR_SCOPE = "@@pixiebrix/READ_ANGULAR_SCOPE";
export const READ_EMBER_COMPONENT = "@@pixiebrix/READ_EMBER_COMPONENT";
export const READ_EMBER_VIEW_ATTRS = "@@pixiebrix/READ_EMBER_VIEW_ATTRS";
export const SCRIPT_LOADED = "@@pixiebrix/SCRIPT_LOADED";
export const CONNECT_EXTENSION = "@@pixiebrix/CONNECT_EXTENSION";
export const DETECT_FRAMEWORK_VERSIONS =
  "@@pixiebrix/DETECT_FRAMEWORK_VERSIONS";
export const READ_REACT_COMPONENT = "@@pixiebrix/READ_REACT_COMPONENT";

export const SET_VUE_VALUES = "@@pixiebrix/SET_VUE_PROPS";
export const READ_VUE_VALUES = "@@pixiebrix/READ_VUE_PROPS";

export const FORWARD_FRAME_DATA = "@@pixiebrix/FORWARD_FRAME_DATA";
export const REQUEST_FRAME_DATA = "@@pixiebrix/REQUEST_FRAME_DATA";

export const DEV_WATCH_READER = "@@pixiebrix/DEV_WATCH_READER";
export const DEV_WATCH_READER_READ = "@@pixiebrix/DEV_WATCH_READER_READ";
export const DEV_WATCH_READER_NOT_AVAILABLE =
  "@@pixiebrix/DEV_WATCH_READER_NOT_AVAILABLE";

export interface FrameworkVersions {
  readonly react?: string;
  readonly emberjs?: string;
  readonly angular?: string;
  readonly jQuery?: string;
  // https://github.com/Maluen/Backbone-Debugger#backbone-detection
  readonly backbone?: string;
  readonly vuejs?: string;
  // https://stackoverflow.com/a/44318447/402560
  readonly redux?: string;
}
