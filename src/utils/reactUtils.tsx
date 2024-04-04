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

import { render, unmountComponentAtNode } from "react-dom";
import { mergeSignals } from "abort-utils";
import { onContextInvalidated } from "webext-events";

export function renderWidget({
  widget,
  name,
  signal,
  position = "after",
}: {
  widget: JSX.Element;
  /** Used to visually identify the element in the dev tools. One word, no "pixiebrix-" */
  name: string;
  signal?: AbortSignal;
  position?: "before" | "after";
}): void {
  if (signal) {
    signal = mergeSignals(signal, onContextInvalidated.signal);
  } else {
    signal = onContextInvalidated.signal;
  }

  // TODO: When switching to React 18, use document.createDocumentFragment()
  // React DOM 17 supports rendering into fragments but then DOM events don't work at all.
  // This will let us leave no trace in the DOM when the widget is unmounted.
  const root = document.createElement("div");
  root.setAttribute("pixiebrix", name);
  root.setAttribute("style", "all: initial");

  // Attach to document *before* rendering, because some effects might need it (e.g. dialogElement.showModal())
  document.body[position](root);
  render(widget, root);

  signal.addEventListener("abort", () => {
    root.remove();
    unmountComponentAtNode(root);
  });
}
