/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import React, { useMemo, useState } from "react";
import { Button, Card, Form, ListGroup, Tab } from "react-bootstrap";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { RendererContext } from "@/components/fields/blockOptions";
import devtoolFields from "@/devTools/editor/fields/Fields";
import { zip } from "lodash";
import "./EffectTab.scss";
import { IBlock } from "@/core";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloud,
  faGripVertical,
  faHighlighter,
  faKeyboard,
  faListOl,
  faPlus,
  faTable,
  faTimes,
  faWindowRestore,
} from "@fortawesome/free-solid-svg-icons";
import { BlockPipeline } from "@/blocks/combinators";
import {
  Field,
  FieldArray,
  FieldInputProps,
  getIn,
  useField,
  useFormikContext,
} from "formik";
import hash from "object-hash";
import Centered from "@/devTools/editor/components/Centered";
import GridLoader from "react-spinners/GridLoader";
import BlockModal from "@/components/fields/BlockModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useBlockOptions } from "@/components/fields/BlockField";
import { BlockType, getType } from "@/blocks/util";
import { ElementType, FormState } from "@/devTools/editor/editorSlice";
import { browser } from "webextension-polyfill-ts";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";

const BlockEntry: React.FunctionComponent<{
  block: IBlock;
  index: number;
  outputKey: string;
  onSelect: () => void;
  onRemove?: () => void;
  isDragDisabled: boolean;
  showDragHandle?: boolean;
  isActive: boolean;
}> = ({
  block,
  index,
  outputKey,
  isDragDisabled,
  showDragHandle = true,
  isActive,
  onSelect,
  onRemove,
}) => {
  if (!block) {
    // There's a race when a new block is saved
    return (
      <ListGroup.Item
        className={cx("ReaderList__item", { dragDisabled: isDragDisabled })}
      >
        <div className="d-flex">
          <div>
            <FontAwesomeIcon icon={faGripVertical} />
          </div>
          <div className="ReaderList__label">
            <div>Block</div>
          </div>
        </div>
      </ListGroup.Item>
    );
  }

  return (
    <Draggable
      index={index}
      isDragDisabled={isDragDisabled}
      draggableId={block.id}
    >
      {(provided) => (
        <ListGroup.Item
          key={`${index}-${block.id}`}
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
              <div>{block.name}</div>
              {outputKey && (
                <div>
                  <code>@{outputKey}</code>
                </div>
              )}
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

function makeKey(blockId: string, index: number): string {
  return `${index}-${blockId}`;
}

// const FlexContainer: React.FunctionComponent<{eventKey: string}> = ({eventKey, children}) => {
//     const currentEventKey = useContext(AccordionContext);
//     return (
//         <div className={cx({"flex-grow-1": currentEventKey === eventKey})}>
//             {children}
//         </div>
//     )
// }

const BlockConfiguration: React.FunctionComponent<{
  name: string;
  block: IBlock;
  showOutput: boolean;
}> = ({ name, block, showOutput }) => {
  const context = useFormikContext();

  const errors = getIn(context.errors, name);

  const [{ error }, BlockOptions] = useBlockOptions(block.id);

  return (
    <div className="BlockAccordion">
      <Card>
        <Card.Header className="BlockAccordion__header">Input</Card.Header>
        <Card.Body>
          <div>
            <RendererContext.Provider value={devtoolFields}>
              {errors?.id && (
                <div className="invalid-feedback d-block mb-4">
                  Unknown block {block.id}
                </div>
              )}
              {BlockOptions ? (
                <BlockOptions
                  name={name}
                  configKey="config"
                  showOutputKey={false}
                />
              ) : error ? (
                <div className="invalid-feedback d-block mb-4">{error}</div>
              ) : (
                <GridLoader />
              )}
            </RendererContext.Provider>
          </div>
        </Card.Body>
      </Card>
      {showOutput && (
        <Card>
          <Card.Header className="BlockAccordion__header">Output</Card.Header>
          <Card.Body>
            <Form.Label>Output key</Form.Label>
            <Field name={`${name}.outputKey`}>
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control type="text" {...field} />
              )}
            </Field>
            <Form.Text className="text-muted">
              Provide a output key to refer to the outputs of this block later.
              For example, if you provide the name <code>output</code>, you can
              use the output later with <code>@output</code>.
            </Form.Text>
          </Card.Body>
        </Card>
      )}
      <Card>
        <Card.Header className="BlockAccordion__header">
          Advanced: Template Engine
        </Card.Header>
        <Card.Body>
          <Form.Label>Template engine</Form.Label>
          <Field name={`${name}.templateEngine`}>
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="select" {...field}>
                <option value="mustache">Mustache</option>
                <option value="handlebars">Handlebars</option>
                <option value="nunjucks">Nunjucks</option>
              </Form.Control>
            )}
          </Field>
          <Form.Text className="text-muted">
            The template engine controls how PixieBrix fills in{" "}
            <code>{"{{variables}}"}</code> in the inputs.
          </Form.Text>
        </Card.Body>
      </Card>
    </div>
  );
};

async function filterBlocks(
  blocks: IBlock[],
  { excludeTypes = [] }: { excludeTypes: BlockType[] }
): Promise<IBlock[]> {
  const types = await Promise.all(blocks.map((block) => getType(block)));
  // exclude null to exclude foundations
  return zip(blocks, types)
    .filter(([, type]) => type != null && !excludeTypes.includes(type))
    .map(([block]) => block);
}

type Recommendation =
  | {
      id: string;
      icon?: IconDefinition;
    }
  | { id: string; src: string };

const RECOMMENDED_BRICKS = new Map<ElementType, Recommendation[]>([
  [
    "menuItem",
    [
      { id: "@pixiebrix/browser/open-tab", icon: faWindowRestore },
      { id: "@pixiebrix/zapier/push-data", src: "img/zapier.svg" },
      { id: "@pixiebrix/forms/set", icon: faKeyboard },
    ],
  ],
  [
    "trigger",
    [
      { id: "@pixiebrix/google/sheets-append", src: "img/google_sheets.svg" },
      { id: "@pixiebrix/highlight", icon: faHighlighter },
      { id: "@pixiebrix/zapier/push-data", src: "img/zapier.svg" },
    ],
  ],
  [
    "contextMenu",
    [
      { id: "@pixiebrix/browser/open-tab", icon: faWindowRestore },
      { id: "@pixiebrix/zapier/push-data", src: "img/zapier.svg" },
      { id: "slack/simple-message", src: "img/slack.svg" },
      { id: "@pixiebrix/google/sheets-append", src: "img/google_sheets.svg" },
    ],
  ],
  [
    "panel",
    [
      { id: "@pixiebrix/property-table", icon: faListOl },
      { id: "@pixiebrix/table", icon: faTable },
      { id: "@pixiebrix/get", icon: faCloud },
    ],
  ],
  [
    "actionPanel",
    [
      { id: "@pixiebrix/property-table", icon: faListOl },
      { id: "@pixiebrix/table", icon: faTable },
      { id: "@pixiebrix/get", icon: faCloud },
    ],
  ],
]);

const QuickAdd: React.FunctionComponent<{
  onSelect: (block: IBlock) => void;
  blocks: IBlock[];
}> = ({ blocks, onSelect }) => {
  const {
    values: { type },
  } = useFormikContext<FormState>();

  const recommendations = RECOMMENDED_BRICKS.get(type);

  const recommendedBlocks = useMemo(() => {
    const matched = (recommendations ?? []).map((recommendation) => ({
      recommendation,
      block: (blocks ?? []).find((x) => x.id === recommendation.id),
    }));
    return matched.filter((x) => x.block != null);
  }, [recommendations, blocks]);

  return (
    <div>
      <h4>Recommended Bricks</h4>
      <div className="RecommendationContainer">
        {recommendedBlocks.map(({ block, recommendation }) => (
          <Card
            className="RecommendationCard"
            key={block.id}
            onClick={() => onSelect(block)}
          >
            <Card.Body className="text-center RecommendationCard__image">
              <div>
                {"src" in recommendation ? (
                  <img
                    src={browser.runtime.getURL(recommendation.src)}
                    height="50"
                    alt={block.name}
                  />
                ) : (
                  <FontAwesomeIcon icon={recommendation.icon} color="#6462aa" />
                )}
              </div>
            </Card.Body>
            <Card.Body>
              <Card.Title>{block.name}</Card.Title>
              <Card.Text className="small">{block.description}</Card.Text>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
};

const EffectTab: React.FunctionComponent<{
  eventKey?: string;
  fieldName?: string;
}> = ({ eventKey = "effect", fieldName = "extension.action" }) => {
  const {
    values: { type },
  } = useFormikContext<FormState>();

  const [blocks] = useAsyncState(async () => {
    return blockRegistry.all();
  }, []);

  const [relevantBlocks] = useAsyncState(async () => {
    const excludeTypes: BlockType[] = ["actionPanel", "panel"].includes(type)
      ? ["reader", "effect"]
      : ["reader", "renderer"];
    return filterBlocks(blocks, { excludeTypes });
  }, [blocks, type]);

  const [{ value: actions = [] }, , helpers] = useField<BlockPipeline>(
    fieldName
  );

  const actionsHash = hash(actions.map((x) => x.id));
  const resolvedBlocks = useMemo(
    () => {
      return actions.map(({ id }) =>
        (blocks ?? []).find((block) => block.id === id)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using actionsHash since we only use the actions ids
    [blocks, actionsHash]
  );

  const [active, setActive] = useState<number | null>(
    actions.length > 0 ? 0 : null
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
          render={({ push, move, remove }) => (
            <div className="h-100 ReaderSidebar flex-grow-0">
              <div className="d-flex">
                <BlockModal
                  blocks={relevantBlocks ?? []}
                  renderButton={({ show }) => (
                    <Button variant="info" size="sm" onClick={show}>
                      <FontAwesomeIcon icon={faPlus} /> Add brick
                    </Button>
                  )}
                  onSelect={(x: IBlock) => {
                    const count = actions.length;
                    push({ id: x.id, config: {} });
                    setActive(count);
                  }}
                />
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
                      {zip(actions, resolvedBlocks).map(
                        ([blockConfig, block], index) => (
                          <BlockEntry
                            key={`${index}-${blockConfig.id}`}
                            index={index}
                            outputKey={blockConfig.outputKey}
                            block={block}
                            onSelect={() => setActive(index)}
                            onRemove={() => {
                              setActive(Math.max(0, index - 1));
                              remove(index);
                            }}
                            isDragDisabled={actions.length === 1}
                            isActive={active === index}
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
            <ErrorBoundary key={makeKey(actions[active]?.id, active)}>
              {active != null && actions[active] != null ? (
                <BlockConfiguration
                  name={`${fieldName}[${active}]`}
                  block={resolvedBlocks[active]}
                  showOutput={active !== actions.length}
                />
              ) : (
                <QuickAdd
                  blocks={relevantBlocks}
                  onSelect={(x: IBlock) => {
                    const count = actions.length;
                    helpers.setValue([...actions, { id: x.id, config: {} }]);
                    setActive(count);
                  }}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EffectTab;
