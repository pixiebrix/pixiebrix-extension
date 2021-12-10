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

import { useField } from "formik";
import React, { ChangeEventHandler } from "react";
import {
  DocumentElement,
  DocumentElementType,
  isListDocument,
  isPipelineDocument,
  ListDocumentElement,
  PipelineDocumentElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { getElementEditSchemas } from "./elementEditSchemas";
import { getProperty, joinName } from "@/utils";
import { Col, Row } from "react-bootstrap";
import styles from "./DocumentEditor.module.scss";
import RemoveElementAction from "./RemoveElementAction";
import MoveElementAction from "./MoveElementAction";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import { getAllowedChildTypes } from "@/components/documentBuilder/allowedElementTypes";
import { produce } from "immer";
import { createNewElement } from "@/components/documentBuilder/createNewElement";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import KeyNameWidget from "@/components/form/widgets/KeyNameWidget";
import BrickModal from "@/components/brickModal/BrickModal";
import { useAsyncState } from "@/hooks/common";
import { BlocksMap } from "@/devTools/editor/tabs/editTab/editTabTypes";
import blockRegistry from "@/blocks/registry";
import { defaultBlockConfig, getType } from "@/blocks/util";
import { IBlock } from "@/core";
import { BlockConfig } from "@/blocks/types";
import { uuidv4 } from "@/types/helpers";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import ElementBlockEdit from "@/components/documentBuilder/edit/ElementBlockEdit";

type ElementEditProps = {
  elementName: string;
  setActiveElement: (activeElement: string) => void;
};

const ElementEditor: React.FC<ElementEditProps> = ({
  elementName,
  setActiveElement,
}) => {
  const [
    { value: documentElement },
    ,
    { setValue: setDocumentElement },
  ] = useField<DocumentElement>(elementName);

  // ToDo refactor this and EditTab.tsx
  const [blocksMap] = useAsyncState<BlocksMap>(
    async () => {
      const blocksMap: BlocksMap = {};
      const blocks = await blockRegistry.all();
      for (const block of blocks) {
        blocksMap[block.id] = {
          block,
          // eslint-disable-next-line no-await-in-loop
          type: await getType(block),
        };
      }

      return blocksMap;
    },
    [],
    {}
  );

  const editSchemas = getElementEditSchemas(documentElement, elementName);

  const isList = isListDocument(documentElement);
  const isPipeline = isPipelineDocument(documentElement);

  const onElementTypeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextType = event.target.value as DocumentElementType;

    const nextDocumentElement = produce(
      documentElement,
      (draft: ListDocumentElement) => {
        draft.config.element.__value__ = createNewElement(nextType);
      }
    );

    setDocumentElement(nextDocumentElement);
  };

  const onPipelineBlockSelected = (block: IBlock) => {
    const blockConfig: BlockConfig = {
      id: block.id,
      instanceId: uuidv4(),
      config: defaultBlockConfig(block.inputSchema),
    };

    const nextDocumentElement = produce(
      documentElement,
      (draft: PipelineDocumentElement) => {
        draft.config.pipeline.__value__ = [blockConfig];
      }
    );

    setDocumentElement(nextDocumentElement);
  };

  return (
    <>
      <Row className={styles.currentFieldRow}>
        <Col xl="3" className={styles.currentField}>
          <h6>
            {getProperty(elementTypeLabels, documentElement.type) ??
              "Unknown element"}
          </h6>
        </Col>
        <Col xl>
          <RemoveElementAction
            elementName={elementName}
            setActiveElement={setActiveElement}
          />
        </Col>
        <Col xl>
          <small className="text-muted">
            Use the Preview Tab on the right to select an element to edit ⟶
          </small>
        </Col>
      </Row>

      <Row>
        <Col>
          {editSchemas.map((editSchema) => (
            <SchemaField key={editSchema.name} {...editSchema} />
          ))}

          {isList && (
            <>
              <ConnectedFieldTemplate
                label="Element key"
                name={joinName(elementName, "config", "elementKey")}
                as={KeyNameWidget}
              />
              <FieldTemplate
                label="Item type"
                name="elementType"
                value={documentElement.config.element.__value__.type}
                onChange={onElementTypeChange}
                as={SelectWidget}
                options={getAllowedChildTypes(documentElement).map((x) => ({
                  // eslint-disable-next-line security/detect-object-injection -- x is a know string
                  label: elementTypeLabels[x],
                  value: x,
                }))}
              />
            </>
          )}

          {isPipeline && documentElement.config.pipeline.__value__.length > 1 && (
            <Row>
              <Col>
                Use Workshop to edit a pipeline made of multiple bricks.
              </Col>
            </Row>
          )}
          {isPipeline &&
            documentElement.config.pipeline.__value__.length === 1 && (
              <>
                <Row>
                  <Col>
                    <BrickModal
                      bricks={Object.values(blocksMap)
                        .filter((x) => x.type === "renderer")
                        .map((x) => x.block)}
                      onSelect={onPipelineBlockSelected}
                    />
                  </Col>
                  <Col>
                    {documentElement.config.pipeline.__value__[0]?.id ??
                      "empty"}
                  </Col>
                </Row>
                <ElementBlockEdit
                  blockConfig={documentElement.config.pipeline.__value__[0]}
                  blockConfigName={`${elementName}.config.pipeline.__value__.0`}
                />
              </>
            )}
        </Col>
      </Row>
      <Row>
        <Col>
          <MoveElementAction
            elementName={elementName}
            setActiveElement={setActiveElement}
          />
        </Col>
      </Row>
    </>
  );
};

export default ElementEditor;
