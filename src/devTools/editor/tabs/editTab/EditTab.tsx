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
import { Col, Tab } from "react-bootstrap";
import EditorNodeLayout from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { getIn, useFormikContext } from "formik";
import { BlockPipeline } from "@/blocks/types";
import { EditorNodeProps } from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { BlockType, defaultBlockConfig, getType } from "@/blocks/util";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { compact, zip } from "lodash";
import { IBlock, OutputKey } from "@/core";
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
import { isInnerExtensionPoint } from "@/devTools/editor/extensionPoints/base";
import { getExampleBlockConfig } from "@/devTools/editor/tabs/editTab/exampleBlockConfigs";
import useExtensionTrace from "@/devTools/editor/hooks/useExtensionTrace";
import FoundationDataPanel from "@/devTools/editor/tabs/editTab/dataPanel/FoundationDataPanel";
import { produceExcludeUnusedDependencies } from "@/components/fields/schemaFields/ServiceField";
import usePipelineField from "@/devTools/editor/hooks/usePipelineField";

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
  editable?: Set<string>;
  pipelineFieldName?: string;
}> = ({ eventKey, pipelineFieldName = "extension.body" }) => {
  useExtensionTrace();
  // ToDo Figure out how to properly bind field validation errors to Formik state // useRuntimeErrors(pipelineFieldName);

  const { values, setValues: setFormValues } = useFormikContext<FormState>();
  const { extensionPoint, type: elementType } = values;

  // For now, don't allow modifying extensionPoint packages via the Page Editor.
  const isLocked = useMemo(
    () => !isInnerExtensionPoint(extensionPoint.metadata.id),
    [extensionPoint.metadata.id]
  );

  const { label, icon, EditorNode: FoundationNode } = ADAPTERS.get(elementType);

  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);

  const [
    { value: blockPipeline = [] },
    { error: blockPipelineError },
    pipelineFieldHelpers,
    traceError,
  ] = usePipelineField(pipelineFieldName);

  const blockFieldName = useMemo(
    () => `${pipelineFieldName}[${activeNodeIndex - 1}]`,
    [pipelineFieldName, activeNodeIndex]
  );

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

  const onSelectNode =
    // Wrapper only accepting a number (i.e., does not accept a state update method)
    useCallback((index: number) => {
      setActiveNodeIndex(index);
    }, []);

  const removeBlock = (pipelineIndex: number) => {
    let nextState = produce(values, (draft) => {
      const pipeline = getIn(draft, pipelineFieldName) as BlockPipeline;
      pipeline.splice(pipelineIndex, 1);
    });

    nextState = produceExcludeUnusedDependencies(nextState);

    // Set the active node before setting the form values, otherwise there's a race condition based on the React state
    // causing a re-render vs. the Formik state causing a re-render
    if (activeNodeIndex > pipelineIndex) {
      setActiveNodeIndex(activeNodeIndex - 1);
    }

    setFormValues(nextState);
  };

  const blockNodes: EditorNodeProps[] = zip(blockPipeline, resolvedBlocks).map(
    ([action, block], index) =>
      block
        ? {
            title: isNullOrBlank(action.label) ? block?.name : action.label,
            outputKey: action.outputKey,
            icon: (
              <BrickIcon
                brick={block}
                size="2x"
                // This makes brick icons that use basic font awesome icons
                //   inherit the editor node layout color scheme.
                // Customized SVG icons are unaffected and keep their branded
                //   color schemes.
                faIconClass={styles.brickFaIcon}
              />
            ),
            // eslint-disable-next-line security/detect-object-injection
            hasError: Boolean(blockPipelineError?.[index]),
            hasWarning: traceError?.blockInstanceId === action.instanceId,
            onClick: () => {
              onSelectNode(index + 1);
            },
          }
        : {
            title: "Loading...",
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
    async (block: IBlock, nodeIndex: number) => {
      const pipelineIndex = nodeIndex - 1;
      const prev = blockPipeline.slice(0, pipelineIndex);
      const next = blockPipeline.slice(pipelineIndex, blockPipeline.length);
      const newBlock = {
        id: block.id,
        outputKey: await generateFreshOutputKey(
          block,
          compact([
            "input" as OutputKey,
            ...blockPipeline.map((x) => x.outputKey),
          ])
        ),
        instanceId: uuidv4(),
        config:
          getExampleBlockConfig(block) ?? defaultBlockConfig(block.inputSchema),
      };
      pipelineFieldHelpers.setValue([...prev, newBlock, ...next]);
      onSelectNode(nodeIndex);
    },
    [onSelectNode, pipelineFieldHelpers, blockPipeline]
  );

  const blockInstanceId = blockPipeline[activeNodeIndex - 1]?.instanceId;

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
          <ErrorBoundary>
            <FormTheme.Provider value={blockConfigTheme}>
              {activeNodeIndex === 0 && (
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

              {activeNodeIndex > 0 && (
                <EditorNodeConfigPanel
                  key={blockPipeline[activeNodeIndex - 1].instanceId}
                  blockFieldName={blockFieldName}
                  blockId={resolvedBlocks[activeNodeIndex - 1].id}
                  onRemoveNode={() => {
                    removeBlock(activeNodeIndex - 1);
                  }}
                />
              )}
            </FormTheme.Provider>
          </ErrorBoundary>
        </div>
        <div className={styles.dataPanel}>
          {activeNodeIndex === 0 ? (
            <FoundationDataPanel
              firstBlockInstanceId={blockPipeline[0]?.instanceId}
            />
          ) : (
            <DataPanel
              key={blockInstanceId}
              blockPipelineFieldName={pipelineFieldName}
              blockPipelineIndex={activeNodeIndex - 1}
              instanceId={blockInstanceId}
            />
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
