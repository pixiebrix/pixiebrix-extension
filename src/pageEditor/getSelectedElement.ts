/*
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

import { expectContext } from "@/utils/expectContext";
import { evaluableFunction } from "@/utils";

export let selectedElement: HTMLElement; // Live binding

const GET_SELECTED_DEV_TOOLS_ELEMENT = "@@pixiebrix/devtools/get-selected";

export function addListenerForUpdateSelectedElement(): void {
  expectContext("contentScript");
  window.addEventListener(GET_SELECTED_DEV_TOOLS_ELEMENT, (element) => {
    selectedElement = element.target as HTMLElement;
  });
}

export async function updateSelectedElement(): Promise<void> {
  let $0: Element; // Unused, type only, don't move it inside `evaluableFunction`

  await browser.devtools.inspectedWindow.eval(
    evaluableFunction(() => {
      // This function does not have access outside its scope,
      // don't use the `GET_SELECTED_DEV_TOOLS_ELEMENT` constant
      ($0 ?? document.body).dispatchEvent(
        new CustomEvent("@@pixiebrix/devtools/get-selected", { bubbles: true })
      );
    })
  );
}
