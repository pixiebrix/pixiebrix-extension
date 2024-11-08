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

import { type Expression } from "../../../../../types/runtimeTypes";
import type React from "react";

export type Spacing = {
  side: string | null;
  size: number | null;
};

export type Value = string | Expression;

/**
 * An independent class name
 */
export type ClassFlag = {
  /**
   * The Bootstrap 4 class name
   */
  className: string;

  /**
   * Title node to render for the element (in a button/dropdown)
   */
  title: React.ReactNode;

  /**
   * True if the flag is exclusive for it's group (default=true)
   */
  exclusive?: boolean;

  /**
   * Other flags in the same group that the flag implies
   */
  implies?: string[];
};
