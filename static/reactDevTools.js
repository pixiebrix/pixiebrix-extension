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

(() => {
  const inject = () => {
    // Must use document.write to run before the app starts
    document.write("<script src='http://localhost:8097'></script>");
  };

  if (localStorage.getItem("dev:react-devtools")) {
    inject();
  }

  window.pbReact = () => {
    if (localStorage.getItem("dev:react-devtools")) {
      localStorage.removeItem("dev:react-devtools");
    } else {
      localStorage.setItem("dev:react-devtools", "yes");
      inject();
      location.reload();
    }
  };
})();
