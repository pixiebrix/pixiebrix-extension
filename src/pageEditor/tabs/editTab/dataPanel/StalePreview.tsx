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
import { selectActiveNode } from "@/pageEditor/slices/editorSelectors";
import { isEqual } from "lodash";
import Alert from "@/components/Alert";

const StalePreview: React.FunctionComponent = () => {
  const traces = useSelector(selectExtensionTrace);
  const activeNode = useSelector(selectActiveNode);
  const trace = traces.find(
    (trace) => trace.blockInstanceId === activeNode?.instanceId
  );

  if (
    traces.length === 0 ||
    trace == null ||
    isEqual(trace.blockConfig, activeNode)
  ) {
    return null;
  }

  return (
    <Alert variant="info">
      The rendered sidebar is out of date with the preview
    </Alert>
  );
};

export default StalePreview;
