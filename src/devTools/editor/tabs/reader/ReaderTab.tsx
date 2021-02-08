/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useContext, useState } from "react";
import { Button, ListGroup, Tab } from "react-bootstrap";
import { FieldArray, useField, useFormikContext } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  FormState,
  isCustomReader,
  ReaderFormState,
  ReaderReferenceFormState,
} from "@/devTools/editor/editorSlice";
import ReaderConfig from "@/devTools/editor/tabs/reader/ReaderConfig";
import { makeDefaultReader } from "@/devTools/editor/extensionPoints/base";
import { DevToolsContext } from "@/devTools/context";
import {
  faBars,
  faBookReader,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import ReaderBlockConfig from "@/devTools/editor/tabs/reader/ReaderBlockConfig";
import BlockModal from "@/components/fields/BlockModal";
import { IBlock, selectMetadata } from "@/core";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";

const ReaderTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
  available: boolean;
}> = ({ eventKey = "reader", editable, available }) => {
  const { tabState } = useContext(DevToolsContext);

  const { values: formValues } = useFormikContext<FormState>();
  const [{ value: readers }] = useField<
    (ReaderReferenceFormState | ReaderFormState)[]
  >("readers");

  const [active, setActive] = useState(0);

  const [blocks] = useAsyncState(async () => {
    const all = await blockRegistry.all();
    const annotated = await Promise.all(
      all.map(async (block: IBlock) => {
        return {
          type: await getType(block),
          block,
        };
      })
    );
    return annotated.filter((x) => x.type === "reader").map((x) => x.block);
  }, []);

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <div className="d-flex">
        <FieldArray
          name="readers"
          render={({ push, move }) => (
            <div className="h-100 ReaderSidebar flex-grow-0">
              <div className="d-flex">
                <BlockModal
                  onSelect={(x) => {
                    const count = readers.length;
                    push({ metadata: selectMetadata(x) });
                    setActive(count);
                  }}
                  blocks={blocks ?? []}
                  renderButton={({ show }) => (
                    <Button onClick={show} variant="info" size="sm">
                      <FontAwesomeIcon icon={faBookReader} /> Add Existing
                    </Button>
                  )}
                />
                <div>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => {
                      const count = readers.length;
                      push(
                        makeDefaultReader(
                          formValues.extensionPoint.metadata,
                          tabState.meta.frameworks ?? []
                        )
                      );
                      setActive(count);
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} /> Create New
                  </Button>
                </div>
              </div>
              <DragDropContext
                onDragEnd={(x) => {
                  move(x.source.index, x.destination.index);
                  setActive(x.destination.index);
                }}
              >
                <Droppable droppableId="reader-list">
                  {(provided) => (
                    <ListGroup
                      className="ReaderList"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {readers.map((reader, index) => (
                        <Draggable
                          key={`${index}-${reader.metadata.id}`}
                          draggableId={reader.metadata.id}
                          index={index}
                          isDragDisabled={readers.length === 1}
                        >
                          {(provided) => (
                            <ListGroup.Item
                              key={`${index}-${reader.metadata.id}`}
                              onClick={() => setActive(index)}
                              active={index === active}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <div className="d-flex">
                                <div {...provided.dragHandleProps}>
                                  <FontAwesomeIcon icon={faBars} />
                                </div>
                                <div className="flex-grow-1 pl-1">
                                  {reader.metadata.name}
                                </div>
                              </div>
                            </ListGroup.Item>
                          )}
                        </Draggable>
                      ))}
                    </ListGroup>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        />
        <div className="ReaderContent h-100">
          {readers.length > 0 && (
            <>
              {
                // safe because active is a number
                // eslint-disable-next-line security/detect-object-injection
                isCustomReader(readers[active]) ? (
                  <ReaderConfig
                    editable={editable}
                    available={available}
                    readerIndex={active}
                  />
                ) : (
                  <ReaderBlockConfig
                    readerIndex={active}
                    available={available}
                  />
                )
              }
            </>
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default ReaderTab;
