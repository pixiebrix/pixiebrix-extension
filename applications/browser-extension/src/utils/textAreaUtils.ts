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

// We'll copy the properties below into the mirror div.
// Note that some browsers, such as Firefox, do not concatenate properties
// into their shorthand (e.g. padding-top, padding-bottom etc. -> padding),
// so we have to list every single property explicitly.
import type { NativeField } from "@/types/inputTypes";

const properties = [
  "direction", // RTL support
  "boxSizing",
  "width", // On Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
  "height",
  "overflowX",
  "overflowY", // Copy the scrollbar for IE

  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",

  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",

  // https://developer.mozilla.org/en-US/docs/Web/CSS/font
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",

  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration", // Might not make a difference, but better be safe

  "letterSpacing",
  "wordSpacing",

  "tabSize",
] as const;

/**
 * Get the caret coordinates in a textarea in pixels.
 * Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
 * Used https://github.com/component/textarea-caret-position/blob/master/index.js as a reference
 * XXX: Due to the complicated nature of doing visual regression testing, this method is not covered by automated testing.
 * Warning! The coordinate values returned when the caret is not within the boundaries of the input or textarea
 * may not be accurate. If needed, use the `snapWithin` function with the getBoundingClientRect() of the element to
 * ensure the coordinates are within the boundaries of the element.
 * @see snapWithin
 * @param element the textarea or input element
 * @param position the position of the caret in the element
 */
export function getCaretCoordinates(element: NativeField, position: number) {
  // The mirror div will replicate the textarea's style
  const div = document.createElement("div");
  div.id = "input-textarea-caret-position-mirror-div";
  document.body.append(div);

  const { style } = div;
  const computed = window.getComputedStyle(element);
  const isInput = element.nodeName === "INPUT";

  // Default textarea styles
  style.whiteSpace = "pre-wrap";
  if (!isInput) {
    style.overflowWrap = "break-word";
  } // Only for textarea-s

  // Position off-screen
  style.position = "absolute"; // Required to return coordinates properly

  let computedLineHeight: number;
  if (computed.lineHeight === "normal") {
    // Use a default value of 1.125 multiplied by the fontSize if the line-height is normal. This seems to be the default
    // line-height in textareas for most browsers from observation during manual testing (not 1.2).
    // https://developer.mozilla.org/en-US/docs/Web/CSS/line-height#normal
    const fontSize = Number.parseInt(computed.fontSize, 10);
    computedLineHeight = fontSize * 1.125;
  } else {
    computedLineHeight = Number.parseInt(computed.lineHeight, 10);
  }

  // Transfer the element's properties to the div
  for (const prop of properties) {
    if (isInput && prop === "lineHeight") {
      // Special case for <input>s because text is rendered centered and line height may be != height
      if (computed.boxSizing === "border-box") {
        const height = Number.parseInt(computed.height, 10);
        const outerHeight =
          Number.parseInt(computed.paddingTop, 10) +
          Number.parseInt(computed.paddingBottom, 10) +
          Number.parseInt(computed.borderTopWidth, 10) +
          Number.parseInt(computed.borderBottomWidth, 10);
        const targetHeight = outerHeight + computedLineHeight;
        if (height > targetHeight) {
          style.lineHeight = height - outerHeight + "px";
        } else if (height === targetHeight) {
          style.lineHeight = computedLineHeight + "px";
        } else {
          style.lineHeight = "0";
        }
      } else {
        style.lineHeight = computed.height;
      }
    } else {
      // eslint-disable-next-line security/detect-object-injection -- assigning styles from computed into hidden div
      style[prop] = computed[prop] as never;
    }
  }

  style.overflow = "hidden"; // For Chrome to not render a scrollbar;

  div.textContent = element.value.slice(0, Math.max(0, position));
  // The second special handling for input type="text" vs textarea:
  // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
  if (isInput) {
    div.textContent = div.textContent.replaceAll(/\s/g, "\u00A0");
  }

  const span = document.createElement("span");
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line before (#7).
  // The  *only* reliable way to do that is to copy the *entire* rest of the
  // textarea's content into the <span> created at the caret position.
  // For inputs, just '.' would be enough, but no need to bother.
  span.textContent = element.value.slice(Math.max(0, position)) || "."; // || because a completely empty faux span doesn't render at all
  div.append(span);

  const coordinates = {
    top: span.offsetTop + Number.parseInt(computed.borderTopWidth, 10),
    left: span.offsetLeft + Number.parseInt(computed.borderLeftWidth, 10),
    height: computedLineHeight,
  };

  div.remove();

  return coordinates;
}
