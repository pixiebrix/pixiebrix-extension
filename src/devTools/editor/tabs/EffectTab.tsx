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
import { Button, ListGroup, Tab } from "react-bootstrap";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { zip } from "lodash";
import "./EffectTab.scss";
import { IBlock } from "@/core";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FieldArray, useField } from "formik";
import hash from "object-hash";
import Centered from "@/devTools/editor/components/Centered";
import GridLoader from "react-spinners/GridLoader";
import BlockModal from "@/components/fields/BlockModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { BlockType, getType } from "@/blocks/util";
import BlockEntry from "@/devTools/editor/tabs/effect/BlockEntry";
import BlockConfiguration from "@/devTools/editor/tabs/effect/BlockConfiguration";
import QuickAdd from "@/devTools/editor/tabs/effect/QuickAdd";
import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";
import { BlockPipeline } from "@/blocks/types";

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

const BlockModalWrapper: React.FunctionComponent<{
  blocks: IBlock[];
  appendBlock: (block: IBlock) => void;
}> = ({ blocks: rawBlocks, appendBlock }) => {
  const blocks: IBlock[] = useMemo(() => rawBlocks ?? [], [rawBlocks]);

  const renderButton = useCallback(
    ({ show }) => (
      <Button variant="info" size="sm" onClick={show}>
        <FontAwesomeIcon icon={faPlus} /> Add brick
      </Button>
    ),
    []
  );

  return (
    <BlockModal
      blocks={blocks}
      renderButton={renderButton}
      onSelect={appendBlock}
    />
  );
};

const EffectTab: React.FunctionComponent<{
  eventKey?: string;
  fieldName?: string;
}> = ({ eventKey = "effect", fieldName = "extension.action" }) => {
  const [{ value: type }] = useField<ElementType>("type");

  const [{ value: actions = [] }, , actionsHelpers] = useField<BlockPipeline>(
    fieldName
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(
    actions.length > 0 ? 0 : null
  );

  const [blocks] = useAsyncState(async () => blockRegistry.all(), []);

  const [relevantBlocks] = useAsyncState(async () => {
    const excludeTypes: BlockType[] = ["actionPanel", "panel"].includes(type)
      ? ["reader", "effect"]
      : ["reader", "renderer"];
    return filterBlocks(blocks, { excludeTypes });
  }, [blocks, type]);

  const actionsHash = hash(actions.map((x) => x.id));
  const resolvedBlocks = useMemo(
    () =>
      actions.map(({ id }) => (blocks ?? []).find((block) => block.id === id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using actionsHash since we only use the actions ids
    [blocks, actionsHash]
  );

  // eslint-disable-next-line security/detect-object-injection -- safe because it's a number
  const activeBlockConfig = actions[activeIndex];
  // eslint-disable-next-line security/detect-object-injection -- safe because it's a number
  const activeBlock = resolvedBlocks[activeIndex];

  const count = actions.length;
  // PERFORMANCE: actionsHelpers.setValue and actions changes on every render
  const appendBlock = useCallback(
    (block: IBlock) => {
      actionsHelpers.setValue([...actions, { id: block.id, config: {} }]);
      setActiveIndex(count);
    },
    [count, actionsHelpers, actions, setActiveIndex]
  );

  if (blocks == null) {
    return (
      <Tab.Pane eventKey={eventKey} className="EffectTab h-100">
        <Centered>
          <GridLoader />
        </Centered>
      </Tab.Pane>
    );
  }

  return (
    <Tab.Pane eventKey={eventKey} className="EffectTab h-100">
      <div className="d-flex h-100">
        <FieldArray
          name={fieldName}
          render={({ move, remove }) => (
            <div className="h-100 ReaderSidebar flex-grow-0">
              <div className="d-flex">
                <BlockModalWrapper
                  blocks={relevantBlocks}
                  appendBlock={appendBlock}
                />
              </div>
              <DragDropContext
                onDragEnd={(x) => {
                  move(x.source.index, x.destination.index);
                  setActiveIndex(x.destination.index);
                }}
              >
                <Droppable droppableId="reader-list">
                  {(provided) => (
                    <ListGroup
                      className="ReaderList"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {zip(actions, resolvedBlocks).map(
                        ([blockConfig, block], index) => (
                          <BlockEntry
                            key={`${index}-${blockConfig.id}`}
                            index={index}
                            isActive={activeIndex === index}
                            isDragDisabled={actions.length === 1}
                            block={block}
                            outputKey={blockConfig.outputKey}
                            onSelect={() => {
                              setActiveIndex(index);
                            }}
                            onRemove={() => {
                              setActiveIndex(Math.max(0, index - 1));
                              remove(index);
                            }}
                          />
                        )
                      )}
                    </ListGroup>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        />
        <div className="h-100 flex-grow-1">
          <div className="overflow-auto">
            {activeBlockConfig == null ? (
              <ErrorBoundary>
                <QuickAdd blocks={relevantBlocks} onSelect={appendBlock} />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary key={`${activeIndex}-${activeBlock.id}`}>
                <BlockConfiguration
                  name={`${fieldName}[${activeIndex}]`}
                  block={activeBlock}
                  showOutput={activeIndex !== count}
                />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EffectTab;
