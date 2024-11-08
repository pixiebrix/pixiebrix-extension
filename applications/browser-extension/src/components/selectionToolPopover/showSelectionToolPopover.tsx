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
import IsolatedComponent from "../IsolatedComponent";
import type Component from "./SelectionToolPopover";

export default function showSelectionToolPopover({
  rootElement,
  ...props
}: {
  rootElement: HTMLElement;
} & React.ComponentProps<typeof Component>) {
  render(
    <IsolatedComponent
      name="SelectionToolPopover"
      lazy={async () =>
        import(
          /* webpackChunkName: "isolated/SelectionToolPopover" */
          "./SelectionToolPopover"
        )
      }
      factory={(SelectionToolPopover) => <SelectionToolPopover {...props} />}
    />,
    rootElement,
  );
}
