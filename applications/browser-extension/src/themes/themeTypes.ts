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

export const DEFAULT_THEME = process.env.IS_BETA ? "beta" : "default";
export const THEME_NAMES = [DEFAULT_THEME, "automation-anywhere"] as const;

/**
 * A list of theme names that are built into the extension. These are mapped to logos in THEME_LOGOS
 * @see THEME_LOGOS
 */
export type ThemeName = (typeof THEME_NAMES)[number];
