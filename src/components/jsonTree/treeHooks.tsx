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

import React, { useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import notify from "@/utils/notify";
import styles from "./JsonTree.module.scss";
import cx from "classnames";
import { getPathFromArray } from "@/runtime/pathHelpers";
import AsyncButton from "@/components/AsyncButton";

export function useLabelRenderer() {
  // https://github.com/reduxjs/redux-devtools/blob/85b4b0fb04b1d6d95054d5073fa17fa61efc0df3/packages/redux-devtools-inspector-monitor/src/ActionPreview.tsx
  return useCallback(
    (
      [key, ...rest]: Array<string | number>,
      nodeType: string,
      expanded: boolean
    ) => (
      <div>
        <span>{key}</span>
        {!expanded && ": "}
        {/* The button must not be a form element,
        otherwise the wrapping label from JSONTree is associated with the element's contents (the button).
        See https://www.w3.org/TR/html401/interact/forms.html#h-17.9.1 */}
        <AsyncButton
          variant="text"
          className={cx(styles.copyPath, "p-0")}
          aria-label="Copy path"
          href="#"
          onClick={async (event) => {
            await navigator.clipboard.writeText(
              getPathFromArray([key, ...rest].reverse())
            );
            event.preventDefault();
            event.stopPropagation();
            notify.info("Copied property path to the clipboard");
          }}
        >
          <FontAwesomeIcon icon={faCopy} aria-hidden />
        </AsyncButton>
      </div>
    ),
    []
  );
}
