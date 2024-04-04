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

import React from "react";
import { render } from "react-dom";
import { mergeSignals } from "abort-utils";
import { onContextInvalidated } from "webext-events";
import AbortSignalGate from "@/components/AbortSignalGate";

// TODO: When switching to React 18, use:
// createRoot(document.createDocumentFragment())
// signal.onabort = () => root.unmount()
// instead of AbortSignalGate
export function renderWidget(
  widget: JSX.Element,
  {
    signal,
    position = "after",
  }: {
    signal?: AbortSignal;
    position?: "before" | "after";
  } = {},
): void {
  if (signal) {
    signal = mergeSignals(signal, onContextInvalidated.signal);
  } else {
    signal = onContextInvalidated.signal;
  }

  const insertionPoint = document.createDocumentFragment();
  render(
    <AbortSignalGate signal={signal}>{widget}</AbortSignalGate>,
    insertionPoint,
  );
  document.body[position](insertionPoint);
}
