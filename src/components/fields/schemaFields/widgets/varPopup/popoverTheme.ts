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

import { jsonTreeTheme } from "@/themes/light";
import { type Theme } from "react-base16-styling";

export const popoverTheme: Theme = {
  extend: jsonTreeTheme,
  base0D: "#2e2441", // Label and arrow color
  arrowContainer: {
    padding: "4px",
    marginRight: "10px",
    backgroundColor: "#f0eff2",
    borderRadius: "2px",
  },
  arrow: {
    height: "12px",
    width: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  // This aligns the arrow, label, and items string (N keys)
  nestedNode: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
  },
  // This makes the nested items to be rendered below the label
  nestedNodeChildren: {
    width: "100%",
  },
  value: {
    display: "flex",
    alignItems: "center",
    paddingLeft: "1.125em",
  },
  label: {
    wordBreak: "initial",
    textIndent: "-0.5em",
  },
  valueText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textIndent: 0,
  },
} as Theme;
