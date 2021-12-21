/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import copy from "copy-to-clipboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { useToasts } from "react-toast-notifications";
import styles from "./JsonTree.module.scss";

export function useLabelRenderer() {
  const { addToast } = useToasts();

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
        <span
          role="button"
          className={styles.copyPath}
          aria-label="copy path"
          onClick={(event) => {
            copy([key, ...rest].reverse().join("."));
            event.stopPropagation();
            addToast("Copied property path to the clipboard", {
              appearance: "info",
              autoDismiss: true,
            });
          }}
        >
          <FontAwesomeIcon icon={faCopy} aria-hidden />
        </span>
      </div>
    ),
    [addToast]
  );
}
