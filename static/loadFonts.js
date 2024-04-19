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

// This script loads the Ubuntu font from Google Fonts and applies it to the page dynamically.
// The font is loaded via a script rather than with an inline style link to avoid render-blocking.
// See: https://pagespeedchecklist.com/asynchronous-google-fonts
const link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700";
link.media = "print";
link.addEventListener("load", (event) => {
  if (event.target && event.target instanceof HTMLLinkElement) {
    event.target.removeAttribute("media");
  }
});

link.fetchpriority = "high";
document.body.append(link);
