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
import { useField, useFormikContext } from "formik";
import { BlockPipeline } from "@/blocks/types";
import { EditorNodeProps } from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { BlockType, getType } from "@/blocks/util";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { compact, noop, zip } from "lodash";
import { IBlock, UUID } from "@/core";
import hash from "object-hash";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { produce } from "immer";
import EditorNodeConfigPanel from "@/devTools/editor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import TraceView from "@/devTools/editor/tabs/editTab/TraceView";
import { uuidv4 } from "@/types/helpers";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { generateFreshOutputKey } from "@/devTools/editor/tabs/editTab/editHelpers";
import FoundationTraceView from "@/devTools/editor/tabs/editTab/FoundationTraceView";
import FormTheme, { ThemeProps } from "@/components/form/FormTheme";
import ErrorBoundary from "@/components/ErrorBoundary";
import BlockIcon from "@/components/BlockIcon";
import { useDispatch, useSelector } from "react-redux";
import { actions as elementWizardActions } from "@/devTools/editor/slices/formBuilderSlice";
import FormPreview from "@/components/formBuilder/FormPreview";
import formBuilderSelectors from "@/devTools/editor/slices/formBuilderSelectors";

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

const NotImplementedFoundationEditor: React.FC<{ isLocked: boolean }> = () => (
  <div>Configuration pane not implement for this extension type yet.</div>
);

const blockConfigTheme: ThemeProps = {
  layout: "vertical",
};

const EditTab: React.FC<{
  eventKey: string;
  editable?: Set<string>;
  pipelineFieldName?: string;
}> = ({ eventKey, pipelineFieldName = "extension.body", editable }) => {
  const {
    installed,
    extensionPoint,
    type: elementType,
  } = useFormikContext<FormState>().values;

  const isLocked = useMemo(
    () => installed && !editable?.has(extensionPoint.metadata.id),
    [editable, installed, extensionPoint.metadata.id]
  );

  const {
    label,
    icon,
    EditorNode: FoundationNode = NotImplementedFoundationEditor,
  } = ADAPTERS.get(elementType);
  const dispatch = useDispatch();
  const setFormBuilderActiveField = (activeField: string) => {
    dispatch(elementWizardActions.setActiveField(activeField));
  };

  const formBuilderActiveField = useSelector(
    formBuilderSelectors.formBuilderActiveField
  );

  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);

  const [
    { value: blockPipeline = [] },
    ,
    pipelineFieldHelpers,
  ] = useField<BlockPipeline>(pipelineFieldName);

  const blockFieldName = useMemo(
    () => `${pipelineFieldName}[${activeNodeIndex - 1}]`,
    [pipelineFieldName, activeNodeIndex]
  );

  const [{ value: blockInstanceId }] = useField<UUID>(
    `${blockFieldName}.instanceId`
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
    const newPipeline = produce(blockPipeline, (draft) => {
      if (activeNodeIndex > pipelineIndex) {
        setActiveNodeIndex(activeNodeIndex - 1);
      }

      draft.splice(pipelineIndex, 1);
    });
    pipelineFieldHelpers.setValue(newPipeline);
  };

  const blockNodes: EditorNodeProps[] = zip(blockPipeline, resolvedBlocks).map(
    ([action, block], index) =>
      block
        ? {
            title: action.label ?? block?.name,
            outputKey: action.outputKey,
            icon: <BlockIcon block={block} size="2x" />,
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
    async (block: IBlock, nodeIndex: number) => {
      const pipelineIndex = nodeIndex - 1;
      const prev = blockPipeline.slice(0, pipelineIndex);
      const next = blockPipeline.slice(pipelineIndex, blockPipeline.length);
      const newBlock = {
        id: block.id,
        outputKey: await generateFreshOutputKey(
          block,
          compact(["@input", ...blockPipeline.map((x) => x.outputKey)])
        ),
        instanceId: uuidv4(),
        config: {},
      };
      pipelineFieldHelpers.setValue([...prev, newBlock, ...next]);
      onSelectNode(nodeIndex);
    },
    [onSelectNode, pipelineFieldHelpers, blockPipeline]
  );

  const blockFieldConfigName = `${blockFieldName}.config`;
  const [{ value: configValue }] = useField(blockFieldConfigName);

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
              {activeNodeIndex === 0 && <FoundationNode isLocked={isLocked} />}

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
        <div className={styles.tracePanel}>
          {activeNodeIndex === 0 && (
            <FoundationTraceView instanceId={blockPipeline[0]?.instanceId} />
          )}

          {activeNodeIndex > 0 &&
            configValue?.schema &&
            configValue?.uiSchema && (
              <FormPreview
                name={blockFieldConfigName}
                activeField={formBuilderActiveField}
                setActiveField={setFormBuilderActiveField}
              />
            )}

          {activeNodeIndex > 0 && (
            <TraceView
              blockFieldName={blockFieldName}
              instanceId={blockInstanceId}
            />
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
