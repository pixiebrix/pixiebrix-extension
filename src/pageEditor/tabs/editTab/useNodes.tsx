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

import React, { useMemo } from "react";
import { BlockPipeline } from "@/blocks/types";
import BrickIcon from "@/components/BrickIcon";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { TraceError, TraceRecord } from "@/telemetry/trace";
import { isNullOrBlank } from "@/utils";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { useSelector } from "react-redux";
import { EditorNodeProps, NodeId } from "./editorNode/EditorNode";
import { FormikError } from "./editTabTypes";
import { TypedBlockMap } from "@/blocks/registry";

function mapPipelineToNodes(
  blockPipeline: BlockPipeline,
  allBlocks: TypedBlockMap,
  traces: TraceRecord[],
  blockPipelineErrors: FormikError,
  errorTraceEntry: TraceError,
  setActiveNodeId: (nodeId: NodeId) => void
) {
  // A flag that shows if there are trace records related to any of the current nodes.
  let nodesHaveTraces = false;
  const nodes = blockPipeline.map((blockConfig, index) => {
    const block = allBlocks.get(blockConfig.id)?.block;
    const nodeId = blockConfig.instanceId;
    const traceRecord = traces.find(
      (trace) => trace.blockInstanceId === nodeId
    );
    if (traceRecord != null) {
      nodesHaveTraces = true;
    }

    if (!block) {
      return {
        nodeId,
        title: "Loading...",
      };
    }

    const newBlock: EditorNodeProps = {
      nodeId,
      title: isNullOrBlank(blockConfig.label) ? block?.name : blockConfig.label,
      icon: <BrickIcon brick={block} size="2x" inheritColor />,
      hasError:
        // If blockPipelineErrors is a string, it means the error is on the pipeline level
        typeof blockPipelineErrors !== "string" &&
        // eslint-disable-next-line security/detect-object-injection
        Boolean(blockPipelineErrors?.[index]),
      hasWarning: errorTraceEntry?.blockInstanceId === blockConfig.instanceId,
      skippedRun: traceRecord?.skippedRun,
      ran: traceRecord != null,
      onClick() {
        setActiveNodeId(blockConfig.instanceId);
      },
      children: [],
    };

    if (blockConfig.outputKey) {
      newBlock.outputKey = blockConfig.outputKey;
    }

    return newBlock;
  });

  return {
    nodes,
    nodesHaveTraces,
  };
}

function useNodes(
  blockPipeline: BlockPipeline,
  blockPipelineErrors: FormikError,
  errorTraceEntry: TraceError,
  label: string,
  icon: IconProp,
  allBlocks: TypedBlockMap,
  setActiveNodeId: (nodeId: NodeId) => void
) {
  const traces = useSelector(selectExtensionTrace);
  const nodes = useMemo<EditorNodeProps[]>(() => {
    const { nodes, nodesHaveTraces } = mapPipelineToNodes(
      blockPipeline,
      allBlocks,
      traces,
      blockPipelineErrors,
      errorTraceEntry,
      setActiveNodeId
    );

    const foundationNode: EditorNodeProps = {
      nodeId: FOUNDATION_NODE_ID,
      outputKey: "input",
      title: label,
      icon,
      // Foundation Node doesn't have its own trace record, so we use the traces flag.
      ran: nodesHaveTraces,
      onClick() {
        setActiveNodeId(FOUNDATION_NODE_ID);
      },
    };

    return [foundationNode, ...nodes];
  }, [
    allBlocks,
    blockPipeline,
    blockPipelineErrors,
    errorTraceEntry?.blockInstanceId,
    icon,
    label,
    setActiveNodeId,
    traces,
  ]);

  return nodes;
}

export default useNodes;
