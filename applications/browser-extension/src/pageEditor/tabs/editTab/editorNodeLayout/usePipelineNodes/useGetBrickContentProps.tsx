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

import { type BrickNodeContentProps } from "../../editTabTypes";
import { type BrickConfig } from "../../../../../bricks/types";
import { filterAnnotationsByBrickPath } from "../../../../utils";
import { type TraceRecord } from "../../../../../telemetry/trace";
import React, { useCallback } from "react";
import PackageIcon from "../../../../../components/PackageIcon";
import { decideBrickStatus } from "../decideStatus";
import { getBrickPipelineNodeSummary } from "../nodeSummary";
import { isNullOrBlank } from "../../../../../utils/stringUtils";
import useTypedBrickMap from "../../../../../bricks/hooks/useTypedBrickMap";
import { selectModComponentAnnotations } from "../../../../../analysis/analysisSelectors";
import {
  selectActiveModComponentFormState,
  selectPipelineMap,
} from "../../../../store/editor/editorSelectors";
import { assertNotNullish } from "../../../../../utils/nullishUtils";
import { useSelector } from "react-redux";
import { useGetIsBrickPipelineExpanded } from "./useGetIsBrickPipelineExpanded";

type BrickContentProps = {
  brickConfig: BrickConfig;
  traceRecord?: TraceRecord;
};

export function useGetBrickContentProps() {
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "activeModComponentFormState is required",
  );
  const annotations = useSelector(
    selectModComponentAnnotations(activeModComponentFormState.uuid),
  );
  const maybePipelineMap = useSelector(selectPipelineMap);

  const { data: allBricks, isLoading: isLoadingBricks } = useTypedBrickMap();
  const getIsBrickPipelineExpanded = useGetIsBrickPipelineExpanded();

  return useCallback(
    ({
      brickConfig,
      traceRecord,
    }: BrickContentProps): BrickNodeContentProps => {
      const brick = allBricks?.get(brickConfig.id)?.block;

      if (isLoadingBricks || !brick) {
        return { brickLabel: "Loading..." };
      }

      const expanded = getIsBrickPipelineExpanded({ brickConfig });

      const nodeId = brickConfig.instanceId;
      assertNotNullish(nodeId, "instanceId is required");
      const brickPath = maybePipelineMap?.[nodeId]?.path;

      const brickAnnotations = brickPath
        ? filterAnnotationsByBrickPath(annotations, brickPath)
        : [];

      return {
        icon: <PackageIcon packageOrMetadata={brick} size="2x" inheritColor />,
        runStatus: decideBrickStatus({
          traceRecord,
          brickAnnotations,
        }),
        brickLabel: isNullOrBlank(brickConfig.label)
          ? brick.name
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked by isNullOrBlank
            brickConfig.label!,
        brickSummary: getBrickPipelineNodeSummary(brickConfig),
        outputKey: expanded ? undefined : brickConfig.outputKey,
      };
    },
    [
      allBricks,
      annotations,
      getIsBrickPipelineExpanded,
      isLoadingBricks,
      maybePipelineMap,
    ],
  );
}
