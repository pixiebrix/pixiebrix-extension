/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

if (process.env.ENVIRONMENT === "development") {
  // Enables highlighting/prettifying
  const html = ([x]) => x;

  document.head.insertAdjacentHTML(
    "beforeend",
    html`
      <style id="pb-dark-mode" media="none">
        @media (prefers-color-scheme: dark) {
          html {
            background: white;
            filter: invert(1) hue-rotate(180deg) contrast(0.8);
          }
        }
      </style>
    `
  );

  const update = (set = localStorage.getItem("dev:dark-mode")) => {
    document.querySelector("#pb-dark-mode").media = set ? "all" : "none";
  };

  update();

  window.pbToggleDark = () => {
    if (localStorage.getItem("dev:dark-mode")) {
      localStorage.removeItem("dev:dark-mode");
      update(false);
    } else {
      localStorage.setItem("dev:dark-mode", "yes");
      update(true);
    }
  };
}
