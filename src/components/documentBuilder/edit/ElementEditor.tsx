/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import React from "react";
import { DocumentElement } from "@/components/documentBuilder/documentBuilderTypes";
import { getProperty } from "@/utils";
import { Col, Row } from "react-bootstrap";
import styles from "./DocumentEditor.module.scss";
import RemoveElement from "./RemoveElement";
import MoveElement from "./MoveElement";
import elementTypeLabels from "@/components/documentBuilder/elementTypeLabels";
import useElementOptions from "@/components/documentBuilder/edit/useElementOptions";

type ElementEditorProps = {
  elementName: string;
  setActiveElement: (activeElement: string) => void;
};

const ElementEditor: React.FC<ElementEditorProps> = ({
  elementName,
  setActiveElement,
}) => {
  const [{ value: documentElement }] = useField<DocumentElement>(elementName);

  const ElementOptions = useElementOptions(documentElement, elementName);

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
          <RemoveElement
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
          <ElementOptions />
        </Col>
      </Row>
      <Row>
        <Col>
          <MoveElement
            elementName={elementName}
            setActiveElement={setActiveElement}
          />
        </Col>
      </Row>
    </>
  );
};

export default ElementEditor;
