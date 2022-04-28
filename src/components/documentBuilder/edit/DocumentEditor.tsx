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

import React from "react";
import styles from "./DocumentEditor.module.scss";
import ElementEditor from "./ElementEditor";
import { Row, Col } from "react-bootstrap";

type DocumentEditorProps = {
  name: string;
  activeElement: string;
  setActiveElement: (activeElement: string) => void;
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  name,
  activeElement,
  setActiveElement,
}) =>
  activeElement ? (
    <ElementEditor
      elementName={activeElement}
      setActiveElement={setActiveElement}
    />
  ) : (
    <Row className={styles.currentFieldRow}>
      <Col xl="3" className={styles.currentField}>
        <h6>Nothing selected</h6>
      </Col>
      <Col xl>
        <small className="text-muted">
          Use the Preview Tab on the right to select an element to edit ⟶
        </small>
      </Col>
    </Row>
  );

export default DocumentEditor;
