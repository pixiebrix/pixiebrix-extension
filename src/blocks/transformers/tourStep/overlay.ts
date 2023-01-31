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

export function addOverlay(
  element: HTMLElement,
  highlightColor: string
): () => void {
  if (element === document.body) {
    throw new Error("Cannot add overlay to body");
  }

  // eslint-disable-next-line unicorn/prevent-abbreviations -- known to be single element
  const $element = $(element);

  if (
    $element.css("display") === "block" ||
    $element.css("display") === "table-cell"
  ) {
    const originalCss = $element.css(["boxShadow", "position"]);

    $element.css({
      position: "relative",
      boxShadow: "0 0 0 max(100vh, 100vw) rgba(0, 0, 0, .3)",
    });

    return () => {
      // $overlay.remove();
      $element.css(originalCss);
    };
  }

  // https://geniuskouta.com/overlay-page-content-except-one-element/

  const $overlay = $('<div data-pb-backdrop aria-hidden="true">');

  $overlay.css({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    position: "fixed",
    backgroundColor: "rgba(0,0,0,0.5)",
  });

  const originalCss = $element.css(["position", "zIndex", "backgroundColor"]);

  $element.css({
    position: "relative",
    zIndex: 1,
    // FIXME: should automatically be based on the parent
    backgroundColor: highlightColor ?? "white",
  });

  $(document.body).prepend($overlay);

  return () => {
    $overlay.remove();
    $element.css(originalCss);
  };
}
