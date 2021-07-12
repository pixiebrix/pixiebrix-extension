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

import React, { useContext, useState } from "react";
import { Button, ListGroup, Tab } from "react-bootstrap";
import { FieldArray, useField, useFormikContext } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FormState, actions } from "@/devTools/editor/editorSlice";
import ReaderConfig from "@/devTools/editor/tabs/reader/ReaderConfig";
import { makeDefaultReader } from "@/devTools/editor/extensionPoints/base";
import { DevToolsContext } from "@/devTools/context";
import {
  faGripVertical,
  faBookReader,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import ReaderBlockConfig, {
  ReaderBlockForm,
} from "@/devTools/editor/tabs/reader/ReaderBlockConfig";
import BlockModal from "@/components/fields/BlockModal";
import { IBlock, IReader, selectMetadata } from "@/core";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { getType } from "@/blocks/util";
import { ContextMenuReader } from "@/extensionPoints/contextMenu";
import cx from "classnames";
import { useToasts } from "react-toast-notifications";
import { useDispatch } from "react-redux";
import {
  isCustomReader,
  ReaderFormState,
  ReaderReferenceFormState,
} from "@/devTools/editor/extensionPoints/elementConfig";

const INCLUDE_TEST_ELEMENT = new Set<string>([
  "@pixiebrix/image/exif",
  "@pixiebrix/image",
  "@pixiebrix/html/element",
]);

const ReaderEntry: React.FunctionComponent<{
  reader: ReaderFormState | ReaderReferenceFormState | IReader;
  index: number;
  onSelect: () => void;
  onRemove?: () => void;
  isDragDisabled: boolean;
  showDragHandle?: boolean;
  isActive: boolean;
}> = ({
  reader,
  index,
  isDragDisabled,
  showDragHandle = true,
  isActive,
  onSelect,
  onRemove,
}) => {
  const meta = "metadata" in reader ? reader.metadata : reader;

  return (
    <Draggable
      index={index}
      isDragDisabled={isDragDisabled}
      draggableId={meta.id}
    >
      {(provided) => (
        <ListGroup.Item
          key={`${index}-${meta.id}`}
          onClick={onSelect}
          active={isActive}
          ref={provided.innerRef}
          className={cx("ReaderList__item", { dragDisabled: isDragDisabled })}
          {...provided.draggableProps}
        >
          <div className="d-flex">
            {showDragHandle && (
              <div {...provided.dragHandleProps}>
                <FontAwesomeIcon icon={faGripVertical} />
              </div>
            )}
            <div className="ReaderList__label">
              <div>{meta.name}</div>
            </div>
            {onRemove && (
              <div className="ReaderList__actions">
                <span role="button" onClick={onRemove} className="text-danger">
                  <FontAwesomeIcon icon={faTimes} />
                </span>
              </div>
            )}
          </div>
        </ListGroup.Item>
      )}
    </Draggable>
  );
};

const CONTEXT_MENU_READER = new ContextMenuReader();

const ReaderTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
  available: boolean;
}> = ({ eventKey = "reader", editable, available }) => {
  const dispatch = useDispatch();
  const { tabState } = useContext(DevToolsContext);
  const { addToast } = useToasts();

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

  // safe because active is a number
  // eslint-disable-next-line security/detect-object-injection
  const reader = readers[active];

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <div className="d-flex">
        <FieldArray
          name="readers"
          render={({ push, move, remove }) => (
            <div className="h-100 ReaderSidebar flex-grow-0">
              <div className="d-flex">
                <BlockModal
                  onSelect={(selected) => {
                    const count = readers.length;
                    if (readers.some((x) => x.metadata.id === selected.id)) {
                      addToast(`Reader ${selected.name} already added`, {
                        appearance: "error",
                        autoDismiss: true,
                      });
                    } else {
                      push({ metadata: selectMetadata(selected) });
                      setActive(count);
                    }
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
                      const reservedIds = readers.map((x) => x.metadata.id);
                      const newReader = makeDefaultReader(
                        formValues.extensionPoint.metadata,
                        tabState.meta.frameworks ?? [],
                        {
                          reservedIds,
                          name: `New reader for ${formValues.extensionPoint.metadata.id}`,
                        }
                      );
                      dispatch(actions.markEditable(newReader.metadata.id));
                      push({ ...newReader, _new: true });
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
                        <ReaderEntry
                          key={`${index}-${reader.metadata.id}`}
                          index={index}
                          reader={reader}
                          onSelect={() => setActive(index)}
                          onRemove={() => {
                            setActive(Math.max(0, index - 1));
                            remove(index);
                          }}
                          isDragDisabled={readers.length === 1}
                          isActive={active === index}
                        />
                      ))}

                      {formValues.type === "contextMenu" && (
                        <ReaderEntry
                          isDragDisabled
                          index={readers.length}
                          reader={CONTEXT_MENU_READER}
                          onSelect={() => setActive(readers.length)}
                          isActive={active === readers.length}
                        />
                      )}
                    </ListGroup>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        />
        <div className="ReaderContent h-100">
          {reader != null && (
            <>
              {isCustomReader(reader) ? (
                <ReaderConfig
                  key={`${reader.metadata.id}-${active}`}
                  editable={editable}
                  available={available}
                  readerIndex={active}
                />
              ) : (
                <ReaderBlockConfig
                  key={`${reader.metadata.id}-${active}`}
                  readerIndex={active}
                  available={available}
                  testElement={INCLUDE_TEST_ELEMENT.has(reader.metadata.id)}
                />
              )}
            </>
          )}
          {active === readers.length && formValues.type === "contextMenu" && (
            <ReaderBlockForm
              reader={CONTEXT_MENU_READER}
              available={available}
              testElement
            />
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default ReaderTab;
