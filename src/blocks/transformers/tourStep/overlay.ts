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

// Adapted from https://github.com/shipshapecode/shepherd/blob/master/src/js/utils/overlay-path.js

// Other possible approaches:
// - https://stackoverflow.com/questions/48184793/how-to-darken-background-except-of-one-element
// - https://stackoverflow.com/questions/24706934/style-all-but-one-element-to-dim-background
// - https://www.webtips.dev/webtips/css/how-to-darken-background-to-give-focus

/**
 * Generates the svg path data for a rounded rectangle overlay
 * @param {Object} dimension - Dimensions of rectangle.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @param {number} [x=0] - Offset from top left corner in x axis. default 0.
 * @param {number} [y=0] - Offset from top left corner in y axis. default 0.
 * @param {number | { topLeft: number, topRight: number, bottomRight: number, bottomLeft: number }} [r=0] - Corner Radius. Keep this smaller than half of width or height.
 * @returns {string} - Rounded rectangle overlay path data.
 */
export function makeOverlayPath({
  width,
  height,
  x = 0,
  y = 0,
  r = 0,
}: {
  width: number;
  height: number;
  x: number;
  y: number;
  r:
    | number
    | {
        topLeft: number;
        topRight: number;
        bottomRight: number;
        bottomLeft: number;
      };
}) {
  const { innerWidth: w, innerHeight: h } = window;
  const {
    topLeft = 0,
    topRight = 0,
    bottomRight = 0,
    bottomLeft = 0,
  } = typeof r === "number"
    ? { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r }
    : r;

  return `M${w},${h}\
H0\
V0\
H${w}\
V${h}\
Z\
M${x + topLeft},${y}\
a${topLeft},${topLeft},0,0,0-${topLeft},${topLeft}\
V${height + y - bottomLeft}\
a${bottomLeft},${bottomLeft},0,0,0,${bottomLeft},${bottomLeft}\
H${width + x - bottomRight}\
a${bottomRight},${bottomRight},0,0,0,${bottomRight}-${bottomRight}\
V${y + topRight}\
a${topRight},${topRight},0,0,0-${topRight}-${topRight}\
Z`;
}

/**
 * Get the visible height of the target element relative to its scrollParent.
 * If there is no scroll parent, the height of the element is returned.
 *
 * @param {HTMLElement} element The target element
 * @param {HTMLElement} [scrollParent] The scrollable parent element
 * @returns {{y: number, height: number}}
 * @private
 */
function _getVisibleHeight(
  element: HTMLElement,
  scrollParent: HTMLElement = null
) {
  const elementRect = element.getBoundingClientRect();
  let top = elementRect.y || elementRect.top;
  let bottom = elementRect.bottom || top + elementRect.height;
  if (scrollParent) {
    const scrollRect = scrollParent.getBoundingClientRect();
    const scrollTop = scrollRect.y || scrollRect.top;
    const scrollBottom = scrollRect.bottom || scrollTop + scrollRect.height;
    top = Math.max(top, scrollTop);
    bottom = Math.min(bottom, scrollBottom);
  }

  const height = Math.max(bottom - top, 0); // Default to 0 if height is negative
  return { y: top, height };
}

/**
 * Find the closest scrollable parent element
 * @param {HTMLElement} element The target element
 * @returns {HTMLElement}
 * @private
 */
function _getScrollParent(element: HTMLElement): HTMLElement | null {
  if (!element) {
    return null;
  }

  const isHtmlElement = element instanceof HTMLElement;
  const overflowY = isHtmlElement && window.getComputedStyle(element).overflowY;
  const isScrollable = overflowY !== "hidden" && overflowY !== "visible";
  if (isScrollable && element.scrollHeight >= element.clientHeight) {
    return element;
  }

  return _getScrollParent(element.parentElement);
}

/**
 * Uses the bounds of the element we want the opening overtop of to set the dimensions of the opening and position it
 * @param {Number} modalOverlayOpeningPadding An amount of padding to add around the modal overlay opening
 * @param {Number | { topLeft: Number, bottomLeft: Number, bottomRight: Number, topRight: Number }} modalOverlayOpeningRadius An amount of border radius to add around the modal overlay opening
 * @param {HTMLElement} scrollParent The scrollable parent of the target element
 * @param {HTMLElement} targetElement The element the opening will expose
 */
export function positionModal(
  modalOverlayOpeningPadding: number,
  modalOverlayOpeningRadius: number,
  scrollParent: HTMLElement,
  targetElement: HTMLElement
) {
  const { y, height } = _getVisibleHeight(targetElement, scrollParent);
  const { x, width, left } = targetElement.getBoundingClientRect();

  // `getBoundingClientRect` is not consistent. Some browsers use x and y, while others use left and top
  return {
    width: width + modalOverlayOpeningPadding * 2,
    height: height + modalOverlayOpeningPadding * 2,
    x: (x || left) - modalOverlayOpeningPadding,
    y: y - modalOverlayOpeningPadding,
    r: modalOverlayOpeningRadius,
  };
}

export function addOverlay(
  target: HTMLElement,
  {
    modalOverlayOpeningPadding = 5,
    modalOverlayOpeningRadius = 5,
  }: {
    modalOverlayOpeningPadding?: number;
    modalOverlayOpeningRadius?: number;
  } = {}
): () => void {
  if (target === document.body) {
    throw new Error("Cannot add overlay to body");
  }

  const scrollParent = _getScrollParent(target);

  const path = makeOverlayPath(
    positionModal(
      modalOverlayOpeningPadding,
      modalOverlayOpeningRadius,
      scrollParent,
      target
    )
  );
  const $svg = $(
    `<svg class="pixiebrix-modal-overlay-container pixiebrix-modal-is-visible"><path d="${path}"</svg>`
  );

  // Setup recursive function to call requestAnimationFrame to update the modal opening position (e.g. due to scroll)
  let rafId: number | undefined;

  const rafLoop = () => {
    rafId = undefined;
    const path = makeOverlayPath(
      positionModal(
        modalOverlayOpeningPadding,
        modalOverlayOpeningRadius,
        scrollParent,
        target
      )
    );

    $svg.find("path").attr("d", path);

    rafId = requestAnimationFrame(rafLoop);
  };

  rafLoop();

  $(document.body).append($svg);

  return () => {
    $svg.remove();
    cancelAnimationFrame(rafId);
  };
}
