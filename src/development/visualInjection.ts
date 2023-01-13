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

import { MAX_Z_INDEX } from "@/common";

if (process.env.ENVIRONMENT === "development") {
  const indicator = document.createElement("div");

  // Hide on hover
  indicator.addEventListener("mouseenter", indicator.remove);

  Object.assign(indicator.style, {
    position: "fixed",
    top: 0,
    height: "1px",
    zIndex: MAX_Z_INDEX,

    // Vary position to see multiple injections
    left: `${Math.random() * 100}px`,

    // Add contrast so it's visible no matter the background
    borderLeft: "solid 5px white",
    borderRight: "solid 5px black",
  });
  document.body.prepend(indicator);
}
