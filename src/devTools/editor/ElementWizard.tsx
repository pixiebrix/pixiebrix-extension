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

import React, { useContext, useState } from "react";
import { PayloadAction } from "@reduxjs/toolkit";
import { DevToolsContext } from "@/devTools/context";
import { useFormikContext } from "formik";
import { useDebounce } from "use-debounce";
import useAsyncEffect from "use-async-effect";
import * as nativeOperations from "@/background/devtools";
import { Button, Col, Form, Nav, Row, Tab } from "react-bootstrap";
import { actions, ButtonState } from "@/devTools/editor/editorSlice";
import FoundationTab from "@/devTools/editor/FoundationTab";
import ReaderTab from "@/devTools/editor/ReaderTab";
import AvailabilityTab from "@/devTools/editor/AvailabilityTab";
import MetaTab from "@/devTools/editor/MetaTab";

const ElementWizard: React.FunctionComponent<{
  element: ButtonState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ element, dispatch }) => {
  const { port } = useContext(DevToolsContext);
  const [step, setStep] = useState("foundation");
  const {
    isSubmitting,
    isValid,
    status,
    handleSubmit,
    handleReset,
  } = useFormikContext();
  const [debounced] = useDebounce(element, 100);

  useAsyncEffect(async () => {
    await nativeOperations.updateButton(port, debounced);
  }, [debounced]);

  return (
    <Form
      autoComplete="off"
      noValidate
      onSubmit={handleSubmit}
      onReset={handleReset}
    >
      <Form.Group as={Row}>
        <Col>
          <Button
            variant="danger"
            className="mr-2"
            onClick={async () => {
              try {
                await nativeOperations.removeElement(port, {
                  uuid: element.uuid,
                });
              } catch (reason) {
                // element might not be on the page anymore
              }
              dispatch(actions.removeElement(element.uuid));
            }}
          >
            Remove
          </Button>

          <Button
            className="mx-2"
            disabled={isSubmitting || !isValid}
            type="submit"
            variant="primary"
          >
            Save
          </Button>
          {status}
        </Col>
      </Form.Group>
      <Tab.Container activeKey={step}>
        <Nav
          variant="pills"
          activeKey={step}
          onSelect={(step: string) => setStep(step)}
        >
          <Nav.Item className="flex-grow-1">
            <Nav.Link eventKey="foundation">1. Foundation</Nav.Link>
          </Nav.Item>
          <Nav.Item className="flex-grow-1">
            <Nav.Link eventKey="reader">2. Reader</Nav.Link>
          </Nav.Item>
          <Nav.Item className="flex-grow-1">
            <Nav.Link eventKey="availability">3. Availability</Nav.Link>
          </Nav.Item>
          <Nav.Item className="flex-grow-1">
            <Nav.Link eventKey="metadata">4. Metadata</Nav.Link>
          </Nav.Item>
        </Nav>
        {step === "foundation" && (
          <FoundationTab element={element} dispatch={dispatch} />
        )}
        {step === "reader" && (
          <ReaderTab element={element} dispatch={dispatch} />
        )}
        {step === "availability" && (
          <AvailabilityTab element={element} dispatch={dispatch} />
        )}
        {step === "metadata" && (
          <MetaTab element={element} dispatch={dispatch} />
        )}
      </Tab.Container>
    </Form>
  );
};

export default ElementWizard;
