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
  ListDocumentElement,
} from "./documentBuilderTypes";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { getElementEditSchemas } from "./elementEditSchemas";
import { getProperty } from "@/utils";
import { Row, Col } from "react-bootstrap";
import styles from "./DocumentEditor.module.scss";
import RemoveElementAction from "./RemoveElementAction";
import MoveElementAction from "./MoveElementAction";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import { ROOT_ELEMENT_TYPES } from "@/components/documentBuilder/allowedElementTypes";
import { produce } from "immer";
import { createNewElement } from "@/components/documentBuilder/createNewElement";

type ElementEditProps = {
  elementName: string;
  setActiveElement: (activeElement: string) => void;
};

const elementTypeLabels: Record<DocumentElementType, string> = {
  header_1: "Header 1",
  header_2: "Header 2",
  header_3: "Header 3",
  container: "Container",
  row: "Row",
  column: "Column",
  card: "Card",
  text: "Text",
  button: "Button",
  block: "Block",
  list: "List",
};

const ElementEdit: React.FC<ElementEditProps> = ({
  elementName,
  setActiveElement,
}) => {
  const [
    { value: documentElement },
    ,
    { setValue: setDocumentElement },
  ] = useField<DocumentElement>(elementName);

  const editSchemas = getElementEditSchemas(documentElement, elementName);

  const isList = isListDocument(documentElement);

  const onElementTypeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextType = event.target.value as DocumentElementType;

    const nextDocumentElement = produce(
      documentElement,
      (draft: ListDocumentElement) => {
        const nextElement = createNewElement(nextType);
        draft.config.element.__value__ = nextElement;
        return draft;
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
            <FieldTemplate
              label="Item type"
              name="elementType"
              value={documentElement.config.element.__value__.type}
              onChange={onElementTypeChange}
              as={SelectWidget}
              options={ROOT_ELEMENT_TYPES.map((x) => ({
                label: elementTypeLabels[x],
                value: x,
              }))}
            />
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

export default ElementEdit;
