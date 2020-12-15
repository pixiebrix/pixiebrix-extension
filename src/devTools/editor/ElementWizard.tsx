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
import { Button, Form, Nav, Tab } from "react-bootstrap";
import { actions, FormState } from "@/devTools/editor/editorSlice";
import FoundationTab from "@/devTools/editor/FoundationTab";
import ReaderTab from "@/devTools/editor/ReaderTab";
import AvailabilityTab from "@/devTools/editor/AvailabilityTab";
import MetaTab from "@/devTools/editor/MetaTab";

const ElementWizard: React.FunctionComponent<{
  element: FormState;
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
    await nativeOperations.updateButton(port, toButtonDefinition(debounced));
  }, [debounced]);

  return (
    <Tab.Container activeKey={step}>
      <Nav
        variant="pills"
        activeKey={step}
        onSelect={(step: string) => setStep(step)}
      >
        <Nav.Item>
          <Nav.Link eventKey="foundation">Foundation</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="reader">Reader</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="action" disabled>
            Action
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="availability">Availability</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="metadata">Metadata</Nav.Link>
        </Nav.Item>
        <div className="flex-grow-1" />
        <Button
          className="mx-2"
          disabled={isSubmitting || !isValid}
          type="submit"
          size="sm"
          variant="primary"
        >
          Save Action
        </Button>

        <Button
          variant="danger"
          className="mr-2"
          size="sm"
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
      </Nav>
      {status && <div>{status}</div>}
      <Form
        autoComplete="off"
        noValidate
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="h-100"
      >
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
      </Form>
    </Tab.Container>
  );
};

export default ElementWizard;
