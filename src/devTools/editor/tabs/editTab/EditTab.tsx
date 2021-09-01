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
import { zip } from "lodash";
import { IBlock } from "@/core";
import EditorModal from "@/devTools/editor/tabs/editTab/editorModal/EditorModal";
import PanelForm from "@/devTools/editor/tabs/actionPanel/PanelForm";
import BlockConfiguration from "@/devTools/editor/tabs/effect/BlockConfiguration";
import hash from "object-hash";

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

  const [activeNodeIndex, setActiveNodeIndex] = useState<number | null>(null);

  const { label, icon } = ADAPTERS.get(elementType);

  const [
    { value: blockPipeline = [] },
    ,
    pipelineFieldHelpers,
  ] = useField<BlockPipeline>(fieldName);

  const [allBlocks] = useAsyncState(async () => blockRegistry.all(), [], []);

  const actionsHash = hash(blockPipeline.map((x) => x.id));
  const resolvedBlocks = useMemo(
    () =>
      blockPipeline.map(({ id }) =>
        (allBlocks ?? []).find((block) => block.id === id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using actionsHash since we only use the actions ids
    [allBlocks, actionsHash]
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
  ).map(([action, block, type], index) => ({
    title: action.label ?? block.name,
    icon: getIcon(block, type),
    onClick: () => {
      onSelectNode(index + 1);
    },
  }));

  const initialNode: EditorNodeProps = useMemo(
    () => ({
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
    (block: IBlock, atIndex: number) => {
      const prev = blockPipeline.slice(0, atIndex);
      const next = blockPipeline.slice(atIndex, blockPipeline.length);
      const newBlock = { id: block.id, config: {} };
      pipelineFieldHelpers.setValue([...prev, newBlock, ...next]);
    },
    [pipelineFieldHelpers, blockPipeline]
  );

  return (
    <Tab.Pane eventKey={eventKey}>
      {activeNodeIndex === 0 && (
        <EditorModal
          onHide={() => {
            setActiveNodeIndex(null);
          }}
          title={label}
        >
          <PanelForm />
        </EditorModal>
      )}

      {activeNodeIndex > 0 && (
        <EditorModal
          onHide={() => {
            setActiveNodeIndex(null);
          }}
          title={
            // eslint-disable-next-line security/detect-object-injection -- numeric index into an array
            nodes[activeNodeIndex].title
          }
        >
          <BlockConfiguration
            name={[fieldName, activeNodeIndex - 1].join(".")}
            block={resolvedBlocks[activeNodeIndex - 1]}
            showOutput={activeNodeIndex !== blockPipeline.length}
          />
        </EditorModal>
      )}

      <EditorNodeLayout
        nodes={nodes}
        relevantBlocksToAdd={relevantBlocksToAdd}
        addBlock={addBlock}
      />
    </Tab.Pane>
  );
};

export default EditTab;
