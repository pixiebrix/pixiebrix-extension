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

export const SIDEBAR_ID = "sidebar";
const smallScreenMediaQuery = "(max-width: 991px)";
const sidebarActiveClassName = "active"; // Used to show/hide navbar on small screen
const sidebarIconOnlyClassName = "sidebar-icon-only"; // Used to show/hide navbar on big screen

function getSidebar(): Element {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We know it exists
  return document.querySelector(`#${SIDEBAR_ID}`)!;
}

export const toggleSidebar = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    getSidebar().classList.toggle(sidebarActiveClassName);
  } else {
    document.body.classList.toggle(sidebarIconOnlyClassName);
  }
};

export const closeSidebarOnSmallScreen = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    getSidebar().classList.remove(sidebarActiveClassName);
  }
};
