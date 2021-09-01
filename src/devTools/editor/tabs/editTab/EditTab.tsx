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

import React, { useCallback, useMemo } from "react";
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

  const { label, icon } = useMemo(() => ADAPTERS.get(elementType),
    [elementType]
  );

  const [{ value: actions = [] }, , actionsHelpers] = useField<BlockPipeline>(
    fieldName
  );

  const [allBlocks] = useAsyncState(async () => blockRegistry.all(),
    [], []);

  const resolvedBlocks = actions.map(({ id }) => allBlocks.find(block => block.id === id));

  const [blockTypes] = useAsyncState(async () => {
    const types = await Promise.all(resolvedBlocks.map(async block => getType(block)));
    return types;
  }, [], []);

  const blockNodes: EditorNodeProps[] = zip(actions, resolvedBlocks, blockTypes)
    .map(([action, block, type], index) => ({
      title: action.label,
      icon: getIcon(block, type),
      onClick: () => { onNodeClick(index + 1) }
    }));

  const initialNode: EditorNodeProps = {
    title: label,
    icon,
    onClick: () => { onNodeClick(0) }
  }

  const nodes: EditorNodeProps[] = [initialNode, ...blockNodes];

  const onNodeClick = useCallback((index: number) => {
    console.log(`on node clicked: ${index}`)
  }, []);

  const [relevantBlocksToAdd] = useAsyncState(async () => {
    const excludeTypes: BlockType[] = ["actionPanel", "panel"].includes(elementType)
      ? ["effect"]
      : ["renderer"];
    return filterBlocks(allBlocks, { excludeTypes });
  }, [allBlocks, elementType]);

  const addBlock = useCallback(
    (block: IBlock, atIndex: number) => {
      const prev = actions.slice(0, atIndex);
      const next = actions.slice(atIndex, actions.length);
      const newBlock = { id: block.id, config: {} };
      actionsHelpers.setValue([...prev, newBlock, ...next]);
    },
    [actionsHelpers, actions]
  );

  return (
    <Tab.Pane eventKey={eventKey}>
      <EditorNodeLayout
        nodes={nodes}
        relevantBlocksToAdd={relevantBlocksToAdd}
        addBlock={addBlock}
      />
    </Tab.Pane>
  );
}

export default EditTab;
