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
import React, { useCallback, useContext, useMemo, useReducer } from "react";
import { DevToolsContext } from "@/devTools/context";
import { Badge, Button, Col, Container, ListGroup, Row } from "react-bootstrap";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as nativeOperations from "@/background/devtools";
import { noop } from "lodash";
import { Formik } from "formik";
import ElementWizard from "@/devTools/editor/ElementWizard";

import {
  actions,
  editorSlice,
  initialState,
} from "@/devTools/editor/editorSlice";

const Editor: React.FunctionComponent = () => {
  const [{ inserting, elements, activeElement }, dispatch] = useReducer(
    editorSlice.reducer,
    initialState
  );

  const { port } = useContext(DevToolsContext);

  const selectedElement = useMemo(() => {
    return activeElement
      ? elements.find((x) => x.uuid === activeElement)
      : null;
  }, [elements, activeElement]);

  const addButton = useCallback(async () => {
    dispatch(actions.toggleInsert(true));
    try {
      const button = await nativeOperations.insertButton(port);
      dispatch(
        actions.addElement({
          ...button,
          reader: {
            type: "react",
            selector: button.containerSelector,
          },
        })
      );
    } finally {
      dispatch(actions.toggleInsert(false));
    }
  }, [port]);

  const toggle = useCallback(
    async (uuid: string, on: boolean) => {
      await nativeOperations.toggleElement(port, { uuid, on });
    },
    [port]
  );

  return (
    <Container fluid>
      <Row>
        <Col className="d-flex">
          <div className="mr-3">
            <h3>Page Editor</h3>
          </div>
          <div className="mx-3">
            <Button disabled={inserting} onClick={addButton}>
              Add Button <FontAwesomeIcon icon={faMousePointer} />
            </Button>
          </div>
        </Col>
      </Row>
      <Row>
        <Col md={2}>
          <ListGroup>
            {elements.map((x) => (
              <ListGroup.Item
                active={x.uuid == activeElement}
                key={x.uuid}
                onMouseEnter={() => toggle(x.uuid, true)}
                onMouseLeave={() => toggle(x.uuid, false)}
                onClick={() => dispatch(actions.selectElement(x.uuid))}
                style={{ cursor: "pointer" }}
              >
                <Badge variant="info">Action</Badge> {x.caption}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
        <Col md={10}>
          {selectedElement ? (
            <Container fluid>
              <Row>
                <Col>
                  <Formik
                    key={selectedElement.uuid}
                    initialValues={selectedElement}
                    onSubmit={noop}
                  >
                    {({ values }) => (
                      <ElementWizard dispatch={dispatch} element={values} />
                    )}
                  </Formik>
                </Col>
              </Row>
            </Container>
          ) : (
            <span>No element selected</span>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Editor;
