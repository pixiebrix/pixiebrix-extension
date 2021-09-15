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

import React, { useCallback, useMemo, useState } from "react";
import { Tab } from "react-bootstrap";
import EditorNodeLayout from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { useField } from "formik";
import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";
import { BlockPipeline } from "@/blocks/types";
import { EditorNodeProps } from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { getIcon } from "@/components/fields/BlockModal";
import { BlockType, getType } from "@/blocks/util";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { noop, zip } from "lodash";
import { IBlock, UUID } from "@/core";
import BlockConfiguration from "@/devTools/editor/tabs/effect/BlockConfiguration";
import hash from "object-hash";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { produce } from "immer";
import EditorNodeConfigPanel from "@/devTools/editor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import TraceView from "@/devTools/editor/tabs/effect/TraceView";
import { uuidv4 } from "@/types/helpers";

async function filterBlocks(
  blocks: IBlock[],
  { excludeTypes = [] }: { excludeTypes: BlockType[] }
): Promise<IBlock[]> {
  const types = await Promise.all(blocks.map(async (block) => getType(block)));
  // Exclude null to exclude foundations
  return zip(blocks, types)
    .filter(([, type]) => type != null && !excludeTypes.includes(type))
    .map(([block]) => block);
}

const EditTab: React.FC<{
  eventKey?: string;
  fieldName?: string;
}> = ({ eventKey = "editTab", fieldName = "extension.body" }) => {
  const [{ value: elementType }] = useField<ElementType>("type");

  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);

  const { label, icon } = ADAPTERS.get(elementType);

  const [
    { value: blockPipeline = [] },
    ,
    pipelineFieldHelpers,
  ] = useField<BlockPipeline>(fieldName);

  const blockName = useMemo(() =>
    [fieldName, activeNodeIndex - 1].join(".")
    , [fieldName, activeNodeIndex]);

  const [{ value: blockInstanceId }] = useField<UUID>(`${blockName}.instanceId`);

  // Load once
  const [allBlocks] = useAsyncState(async () => blockRegistry.all(), [], []);

  const pipelineIdHash = hash(blockPipeline.map((x) => x.id));
  const resolvedBlocks = useMemo(
    () =>
      blockPipeline.map(({ id }) =>
        (allBlocks ?? []).find((block) => block.id === id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using actionsHash since we only use the actions ids
    [allBlocks, pipelineIdHash]
  );

  const [blockTypes] = useAsyncState(
    async () =>
      Promise.all(resolvedBlocks.map(async (block) => getType(block))),
    [resolvedBlocks]
  );

  const onSelectNode = useCallback(
    (index: number) => {
      setActiveNodeIndex(index);
    },
    [setActiveNodeIndex]
  );

  const blockNodes: EditorNodeProps[] = zip(
    blockPipeline,
    resolvedBlocks,
    blockTypes
  ).map(([action, block, type], index) =>
    block
      ? {
          title: action.label ?? block?.name,
          outputKey: action.outputKey,
          icon: getIcon(block, type),
          onClick: () => {
            onSelectNode(index + 1);
          },
        }
      : {
          title: "Loading...",
          icon: faSpinner,
          onClick: noop,
        }
  );

  const initialNode: EditorNodeProps = useMemo(
    () => ({
      outputKey: "input",
      title: label,
      icon,
      onClick: () => {
        onSelectNode(0);
      },
    }),
    [icon, label, onSelectNode]
  );

  const nodes: EditorNodeProps[] = [initialNode, ...blockNodes];

  const [relevantBlocksToAdd] = useAsyncState(async () => {
    const excludeTypes: BlockType[] = ["actionPanel", "panel"].includes(
      elementType
    )
      ? ["effect"]
      : ["renderer"];
    return filterBlocks(allBlocks, { excludeTypes });
  }, [allBlocks, elementType]);

  const addBlock = useCallback(
    (block: IBlock, nodeIndex: number) => {
      const pipelineIndex = nodeIndex - 1;
      const prev = blockPipeline.slice(0, pipelineIndex);
      const next = blockPipeline.slice(pipelineIndex, blockPipeline.length);
      const newBlock = { id: block.id, instanceId: uuidv4(), config: {} };
      pipelineFieldHelpers.setValue([...prev, newBlock, ...next]);
    },
    [pipelineFieldHelpers, blockPipeline]
  );

  const removeBlock = (pipelineIndex: number) => {
    const newPipeline = produce(blockPipeline, (draft) => {
      setActiveNodeIndex(null);
      draft.splice(pipelineIndex, 1);
    });
    pipelineFieldHelpers.setValue(newPipeline);
  };

  return (
    <Tab.Pane eventKey={eventKey} className={styles.tabPane}>
      <div className={styles.paneContent}>
        <div className={styles.nodeLayout}>
          <EditorNodeLayout
            nodes={nodes}
            activeNodeIndex={activeNodeIndex}
            showAppend={
              !blockTypes ||
              blockTypes?.length === 0 ||
              blockTypes[blockTypes.length - 1] !== "renderer"
            }
            relevantBlocksToAdd={relevantBlocksToAdd}
            addBlock={addBlock}
          />
        </div>
        <div className={styles.configPanel}>
          {activeNodeIndex === 0 && (
            <EditorNodeConfigPanel>
              {/* <FoundationForm /> */}
            </EditorNodeConfigPanel>
          )}

          {activeNodeIndex > 0 && (
            <EditorNodeConfigPanel
              onRemoveNode={() => {
                removeBlock(activeNodeIndex - 1);
              }}
            >
              <BlockConfiguration
                name={blockName}
                block={resolvedBlocks[activeNodeIndex - 1]}
                showOutput={activeNodeIndex !== blockPipeline.length}
              />
            </EditorNodeConfigPanel>
          )}
        </div>
        <div className={styles.tracePanel}>
          <TraceView instanceId={blockInstanceId} />
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
