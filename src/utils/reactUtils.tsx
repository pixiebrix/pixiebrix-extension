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

/**
 * Render a React component in the document, with defaults that reduce conflicts.
 * It's automatically removed on context invalidated.
 *
 * @param widget The React component to render.
 * @param name A name used to visually identify the widget in the dev tools.
 * @param signal An signal that will abort the remove the widget when aborted.
 * @param position The method to use on `document.body` to attach the widget (e.g. "before" -> `document.body.before()`)
 *
 * @example
 *   renderWidget({
 *     name: "MyWidget",
 *     widget: <MyWidget />,
 *   });
 *
 * @example
 *   renderWidget({
 *     name: "notifications",
 *     widget: <Toast message="Oopsie" />,
 *     signal: AbortSignal.timeout(1000),
 *     position: "before",
 *   });
 */
export function renderWidget({
  name,
  widget,
  signal,
  position = "after",
  keepAfterInvalidation = false,
}: {
  name: string;
  widget: JSX.Element;
  signal?: AbortSignal;
  position?: "before" | "after";
  keepAfterInvalidation?: boolean;
}): void {
  if (!keepAfterInvalidation) {
    if (signal) {
      signal = mergeSignals(signal, onContextInvalidated.signal);
    } else {
      signal = onContextInvalidated.signal;
    }
  }

  if (signal?.aborted) {
    return;
  }

  // TODO: When switching to React 18, use document.createDocumentFragment()
  // React DOM 17 supports rendering into fragments but then DOM events don't work at all.
  // This will let us leave no trace in the DOM when the widget is unmounted.
  const root = document.createElement("pixiebrix-widget"); // Custom element to avoid CSS conflicts
  root.setAttribute("pb-name", name); // For identification in the dev tools
  root.setAttribute("style", "display: block; all: initial");

  // Attach to document *before* rendering, because some effects might need it (e.g. dialogElement.showModal())
  document.body[position](root);
  render(widget, root);

  signal?.addEventListener("abort", () => {
    root.remove();
    unmountComponentAtNode(root);
  });
}
