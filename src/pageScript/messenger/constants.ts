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

export const SEARCH_WINDOW = "@@pixiebrix/script/SEARCH_WINDOW";
export const READ_WINDOW = "@@pixiebrix/script/READ_WINDOW";
export const SCRIPT_LOADED = "@@pixiebrix/script/SCRIPT_LOADED";
export const CONNECT_EXTENSION = "@@pixiebrix/script/CONNECT_EXTENSION";
export const DETECT_FRAMEWORK_VERSIONS =
  "@@pixiebrix/script/DETECT_FRAMEWORK_VERSIONS";

export const GET_COMPONENT_DATA = "@@pixiebrix/script/GET_COMPONENT_DATA";
export const SET_COMPONENT_DATA = "@@pixiebrix/script/SET_COMPONENT_DATA";
export const GET_COMPONENT_INFO = "@@pixiebrix/script/GET_COMPONENT_INFO";

type UNKNOWN_VERSION = null;

export const KNOWN_ADAPTERS = ["react", "emberjs", "angularjs", "vue"] as const;
export const KNOWN_READERS = [...KNOWN_ADAPTERS, "jquery"] as const;

export type FrameworkAdapter = typeof KNOWN_ADAPTERS[number];
export type Framework = typeof KNOWN_READERS[number];

export interface FrameworkMeta {
  id: Framework;
  version: string | UNKNOWN_VERSION;
}
