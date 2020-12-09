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
export const SCRIPT_LOADED = "@@pixiebrix/SCRIPT_LOADED";
export const CONNECT_EXTENSION = "@@pixiebrix/CONNECT_EXTENSION";
export const DETECT_FRAMEWORK_VERSIONS =
  "@@pixiebrix/DETECT_FRAMEWORK_VERSIONS";

export const GET_COMPONENT_DATA = "@@pixiebrix/GET_COMPONENT_DATA";
export const SET_COMPONENT_DATA = "@@pixiebrix/SET_COMPONENT_DATA";

export const FORWARD_FRAME_DATA = "@@pixiebrix/FORWARD_FRAME_DATA";
export const REQUEST_FRAME_DATA = "@@pixiebrix/REQUEST_FRAME_DATA";

type UNKNOWN_VERSION = null;

export const KNOWN_READERS = <const>[
  "react",
  "emberjs",
  "angular",
  "angularjs",
  "vue",
  "jquery",
];

export type Framework = typeof KNOWN_READERS[number];

export interface FrameworkMeta {
  id: Framework;
  version: string | UNKNOWN_VERSION;
}
