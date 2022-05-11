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

import React from "react";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import { useSelector } from "react-redux";
import {
  selectActiveElement,
  selectActiveNode,
} from "@/pageEditor/slices/editorSelectors";
import { isEqual } from "lodash";
import Alert from "@/components/Alert";

const StalePanelAlert: React.FunctionComponent = () => {
  const activeElement = useSelector(selectActiveElement);
  const traces = useSelector(selectExtensionTrace);
  const activeNode = useSelector(selectActiveNode);

  // Only show alert for Panel and Side Panel extensions
  if (
    activeElement?.type !== "panel" &&
    activeElement?.type !== "actionPanel"
  ) {
    return null;
  }

  const trace = traces.find(
    (trace) => trace.blockInstanceId === activeNode?.instanceId
  );

  // No traces or no changes since the last render, we are good, no alert
  if (
    traces.length === 0 ||
    trace == null ||
    isEqual(trace.blockConfig, activeNode)
  ) {
    return null;
  }

  return (
    <Alert variant="info">
      The rendered {activeElement.type === "panel" ? "Panel" : "Sidebar Panel"}{" "}
      is out of date with the preview
    </Alert>
  );
};

export default StalePanelAlert;
