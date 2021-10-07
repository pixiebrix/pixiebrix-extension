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

import React, { useMemo, useState } from "react";
import { Col, Tab } from "react-bootstrap";
import EditorNodeLayout from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { useFormikContext } from "formik";
import { BlockConfig } from "@/blocks/types";
import {
  EditorNodeProps,
  NodeId,
} from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { BlockType, defaultBlockConfig, getType } from "@/blocks/util";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { compact, zip } from "lodash";
import { IBlock, OutputKey, UUID } from "@/core";
import hash from "object-hash";
import { produce } from "immer";
import EditorNodeConfigPanel from "@/devTools/editor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import { uuidv4 } from "@/types/helpers";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { generateFreshOutputKey } from "@/devTools/editor/tabs/editTab/editHelpers";
import FormTheme, { ThemeProps } from "@/components/form/FormTheme";
import ErrorBoundary from "@/components/ErrorBoundary";
import BrickIcon from "@/components/BrickIcon";
import { isNullOrBlank } from "@/utils";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import DataPanel from "@/devTools/editor/tabs/editTab/dataPanel/DataPanel";
import {
  isInnerExtensionPoint,
  pipelineFromExtension,
} from "@/devTools/editor/extensionPoints/base";
import { getExampleBlockConfig } from "@/devTools/editor/tabs/editTab/exampleBlockConfigs";
import useExtensionTrace from "@/devTools/editor/hooks/useExtensionTrace";
import FoundationDataPanel from "@/devTools/editor/tabs/editTab/dataPanel/FoundationDataPanel";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/ServiceField";
import usePipelineBlocksField from "@/devTools/editor/hooks/usePipelineBlocksField";

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

const blockConfigTheme: ThemeProps = {
  layout: "horizontal",
};

const EditTab: React.FC<{
  eventKey: string;
}> = ({ eventKey }) => {
  useExtensionTrace();

  const { values, setValues: setFormValues } = useFormikContext<FormState>();
  const { extensionPoint, type: elementType, extension } = values;

  // For now, don't allow modifying extensionPoint packages via the Page Editor.
  const isLocked = useMemo(
    () => !isInnerExtensionPoint(extensionPoint.metadata.id),
    [extensionPoint.metadata.id]
  );

  const [activeNodeId, setActiveNodeId] = useState<NodeId>("foundation");

  const [, pipelineBlocksErrors, , traceError] = usePipelineBlocksField();

  // Load once
  const [allBlocks] = useAsyncState(async () => blockRegistry.all(), [], []);

  const pipelineIdHash = hash(
    Object.values(extension.pipelineBlocks).map((x) => x.id)
  );
  const resolvedBlocks = useMemo(
    () => {
      const resolved: Record<UUID, IBlock> = {};
      for (const blockConfig of Object.values(extension.pipelineBlocks)) {
        resolved[blockConfig.instanceId] = allBlocks.find(
          (x) => x.id === blockConfig.id
        );
      }

      return resolved;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using actionsHash since we only use the actions ids
    [allBlocks, pipelineIdHash]
  );

  const [showAppendNode] = useAsyncState(
    async () => {
      if (!resolvedBlocks || Object.keys(resolvedBlocks).length === 0) {
        return true;
      }

      const id = extension.pipelineOrder[extension.pipelineOrder.length - 1];
      // eslint-disable-next-line security/detect-object-injection -- uuid
      const lastType = await getType(resolvedBlocks[id]);
      return lastType !== "renderer";
    },
    [resolvedBlocks, extension.pipelineOrder],
    false
  );

  const removeBlock = (instanceIdToRemove: UUID) => {
    let prevNodeId: NodeId;
    let nextState = produce(values, (draft) => {
      const index = draft.extension.pipelineOrder.indexOf(instanceIdToRemove);
      if (index === 0) {
        prevNodeId = "foundation";
      } else {
        prevNodeId = draft.extension.pipelineOrder[index - 1];
      }

      draft.extension.pipelineOrder.splice(index, 1);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,security/detect-object-injection -- uuid
      delete draft.extension.pipelineBlocks[instanceIdToRemove];
    });

    nextState = produceExcludeUnusedDependencies(nextState);

    // Set the active node before setting the form values, otherwise there's a race condition based on the React state
    // causing a re-render vs. the Formik state causing a re-render
    if (activeNodeId === instanceIdToRemove) {
      setActiveNodeId(prevNodeId);
    }

    setFormValues(nextState);
  };

  const { label, icon, EditorNode: FoundationNode } = ADAPTERS.get(elementType);

  const blockNodes: EditorNodeProps[] = extension.pipelineOrder.map(
    (instanceId) => {
      const blockConfig = extension.pipelineBlocks[instanceId];
      const iBlock = resolvedBlocks[instanceId];
      const nodeId = instanceId;
      return iBlock
        ? {
            nodeId,
            title: isNullOrBlank(blockConfig.label)
              ? iBlock?.name
              : blockConfig.label,
            outputKey: blockConfig.outputKey,
            icon: (
              <BrickIcon
                brick={iBlock}
                size="2x"
                // This makes brick icons that use basic font awesome icons
                //   inherit the editor node layout color scheme.
                // Customized SVG icons are unaffected and keep their branded
                //   color schemes.
                faIconClass={styles.brickFaIcon}
              />
            ),
            hasError: Boolean(pipelineBlocksErrors?.[instanceId]),
            hasWarning: traceError?.blockInstanceId === instanceId,
            onClick: () => {
              setActiveNodeId(instanceId);
            },
          }
        : {
            nodeId,
            title: "Loading...",
          };
    }
  );

  const foundationNode: EditorNodeProps = {
    nodeId: "foundation",
    outputKey: "input",
    title: label,
    icon,
    onClick: () => {
      setActiveNodeId("foundation");
    },
  };

  const nodes: EditorNodeProps[] = [foundationNode, ...blockNodes];

  const [relevantBlocksToAdd] = useAsyncState(async () => {
    const excludeTypes: BlockType[] = ["actionPanel", "panel"].includes(
      elementType
    )
      ? ["effect"]
      : ["renderer"];
    return filterBlocks(allBlocks, { excludeTypes });
  }, [allBlocks, elementType]);

  const addBlock = async (block: IBlock, beforeInstanceId?: UUID) => {
    const insertIndex = beforeInstanceId
      ? extension.pipelineOrder.indexOf(beforeInstanceId)
      : extension.pipelineOrder.length;
    const newBlock: BlockConfig = {
      id: block.id,
      outputKey: await generateFreshOutputKey(
        block,
        compact([
          "input" as OutputKey,
          ...pipelineFromExtension(extension).map((x) => x.outputKey),
        ])
      ),
      instanceId: uuidv4(),
      config:
        getExampleBlockConfig(block) ?? defaultBlockConfig(block.inputSchema),
    };
    const nextState = produce(values, (draft) => {
      draft.extension.pipelineBlocks[newBlock.instanceId] = newBlock;
      draft.extension.pipelineOrder.splice(insertIndex, 0, newBlock.instanceId);
    });
    setFormValues(nextState);
    setActiveNodeId(newBlock.instanceId);
  };

  const blockFieldName = `extension.pipelineBlocks[${activeNodeId}]`;

  return (
    <Tab.Pane eventKey={eventKey} className={styles.tabPane}>
      <div className={styles.paneContent}>
        <div className={styles.nodeLayout}>
          <EditorNodeLayout
            nodes={nodes}
            activeNodeId={activeNodeId}
            relevantBlocksToAdd={relevantBlocksToAdd}
            addBlock={addBlock}
            showAppend={showAppendNode}
          />
        </div>
        <div className={styles.configPanel}>
          <ErrorBoundary>
            <FormTheme.Provider value={blockConfigTheme}>
              {activeNodeId === "foundation" && (
                <>
                  <Col>
                    <ConnectedFieldTemplate
                      name="label"
                      label="Extension Name"
                    />
                  </Col>
                  <FoundationNode isLocked={isLocked} />
                </>
              )}

              {activeNodeId !== "foundation" && activeNodeId !== "append" && (
                <EditorNodeConfigPanel
                  key={activeNodeId}
                  blockFieldName={blockFieldName}
                  // eslint-disable-next-line security/detect-object-injection -- RegistryId
                  blockId={extension.pipelineBlocks[activeNodeId].id}
                  onRemoveNode={() => {
                    removeBlock(activeNodeId);
                  }}
                />
              )}
            </FormTheme.Provider>
          </ErrorBoundary>
        </div>
        <div className={styles.dataPanel}>
          {activeNodeId === "foundation" ? (
            <FoundationDataPanel
              firstBlockInstanceId={
                extension.pipelineBlocks[extension.pipelineOrder[0]]?.instanceId
              }
            />
          ) : (
            activeNodeId !== "append" && (
              <DataPanel key={activeNodeId} instanceId={activeNodeId} />
            )
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
