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
import React, { useMemo, useReducer } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Formik } from "formik";
import ElementWizard from "@/devTools/editor/ElementWizard";
import { editorSlice, initialState } from "@/devTools/editor/editorSlice";
import { useCreate } from "@/devTools/editor/useCreate";
import Sidebar from "@/devTools/editor/Sidebar";

const Editor: React.FunctionComponent = () => {
  const [{ inserting, elements, activeElement }, dispatch] = useReducer(
    editorSlice.reducer,
    initialState
  );

  const selectedElement = useMemo(() => {
    return activeElement
      ? elements.find((x) => x.uuid === activeElement)
      : null;
  }, [elements, activeElement]);

  const create = useCreate();

  return (
    <Container fluid className="h-100">
      <Row className="h-100">
        <Col md={2} className="h-100 pr-0">
          <Sidebar
            dispatch={dispatch}
            elements={elements}
            activeElement={activeElement}
            inserting={inserting}
          />
        </Col>
        <Col md={10} className="pl-2 h-100">
          {selectedElement ? (
            <Formik
              key={selectedElement.uuid}
              initialValues={selectedElement}
              onSubmit={create}
            >
              {({ values }) => (
                <ElementWizard dispatch={dispatch} element={values} />
              )}
            </Formik>
          ) : elements.length ? (
            <span>No element selected</span>
          ) : (
            <span>No elements added to page yet</span>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Editor;
