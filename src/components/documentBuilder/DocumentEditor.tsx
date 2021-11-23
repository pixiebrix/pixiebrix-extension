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

import React from "react";
import AddElementAction from "./AddElementAction";
import styles from "./DocumentEditor.module.scss";
import { ROOT_ELEMENT_TYPES } from "./allowedElementTypes";
import ElementEdit from "./ElementEdit";
import { Row, Col } from "react-bootstrap";
import RemoveElementAction from "./RemoveElementAction";
import MoveElementAction from "./MoveElementAction";

type DocumentEditorProps = {
  name: string;
  activeElement: string;
  setActiveElement: (activeElement: string) => void;
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  name,
  activeElement,
  setActiveElement,
}) => (
  <>
    <Row className={styles.addRow}>
      <Col>
        <AddElementAction
          as="button"
          elementsCollectionName={name}
          allowedTypes={ROOT_ELEMENT_TYPES}
        />
      </Col>
    </Row>

    <Row className={styles.currentFieldRow}>
      <Col xl="3" className={styles.currentField}>
        <h6>Current Element</h6>
      </Col>
      {activeElement && (
        <Col xl>
          <RemoveElementAction elementName={activeElement} />
        </Col>
      )}
      <Col xl>
        <small className="text-muted">
          Use the Preview Tab on the right to select an element to edit ⟶
        </small>
      </Col>
    </Row>

    {activeElement && (
      <>
        <Row>
          <Col>
            <ElementEdit elementName={activeElement} />
          </Col>
        </Row>
        <Row>
          <Col>
            <MoveElementAction
              elementName={activeElement}
              setActiveElement={setActiveElement}
            />
          </Col>
        </Row>
      </>
    )}
  </>
);

export default DocumentEditor;
