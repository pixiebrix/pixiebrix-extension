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

import excludeAltClicksEtc from "filter-altered-clicks";

const listener = excludeAltClicksEtc((event: MouseEvent) => {
  // `composedPath` is used to support clicks in an `open` Shadow DOM
  // https://github.com/pixiebrix/pixiebrix-extension/issues/8206
  for (const eventTarget of event.composedPath()) {
    if (eventTarget instanceof HTMLAnchorElement) {
      window.open(eventTarget.href);
      event.preventDefault();
      return;
    }
  }
});

/**
 * Causes all unaltered links to open in new tabs.
 *
 * This is only used for Edge at the moment. You can achieve the same result via a single `<base target="_blank">` tag in the `<head>`.
 * https://github.com/pixiebrix/pixiebrix-extension/issues/7809
 */
export default function openAllLinksInPopups(signal?: AbortSignal) {
  document.body.addEventListener("click", listener, { signal });
}
