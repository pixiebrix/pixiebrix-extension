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
import InvalidatedContextGate from "@/components/InvalidatedContextGate";
import { render } from "react-dom";

// TODO: Use createRoot(document.createDocumentFragment()) and root.unmount() when switching to React 18
export function renderWidget(widget: JSX.Element): void {
  const insertionPoint = document.createDocumentFragment();
  render(
    <InvalidatedContextGate emptyOnInvalidation>
      {widget}
    </InvalidatedContextGate>,
    insertionPoint,
  );
  document.body.after(insertionPoint);
}
