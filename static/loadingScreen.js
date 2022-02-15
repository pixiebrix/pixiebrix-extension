/*!
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

/** @file Plain file to show loading errors on the page. It must be simple and outside the build specifically to show even build errors. */

function showErrors(errorEvent) {
  const logger = document.querySelector(".global-loading-message");
  if (logger.childElementCount > 0) {
    // The view was initialized, stop showing errors
    window.removeEventListener("error", showErrors);
    return;
  }

  logger.textContent = String(errorEvent.error);
  logger.style.fontFamily = "monospace";
  logger.style.whiteSpace = "pre";
}

window.addEventListener("error", showErrors);
