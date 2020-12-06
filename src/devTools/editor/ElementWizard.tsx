import React, { useContext, useState } from "react";
import { PayloadAction } from "@reduxjs/toolkit";
import { DevToolsContext } from "@/devTools/context";
import { useFormikContext } from "formik";
import { useDebounce } from "use-debounce";
import useAsyncEffect from "use-async-effect";
import * as nativeOperations from "@/background/devtools";
import { Form, Nav, Tab } from "react-bootstrap";
import { ButtonState } from "@/devTools/editor/editorSlice";
import FoundationTab from "@/devTools/editor/FoundationTab";
import ReaderTab from "@/devTools/editor/ReaderTab";

const ElementWizard: React.FunctionComponent<{
  element: ButtonState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ element, dispatch }) => {
  const { port } = useContext(DevToolsContext);
  const [step, setStep] = useState("foundation");

  const { submitForm } = useFormikContext();
  const [debounced] = useDebounce(element, 100);

  useAsyncEffect(async () => {
    await nativeOperations.updateButton(port, debounced);
  }, [debounced]);

  return (
    <Form autoComplete="off" noValidate onSubmit={submitForm}>
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
            <Nav.Link eventKey="action">3. Action</Nav.Link>
          </Nav.Item>
          <Nav.Item className="flex-grow-1">
            <Nav.Link eventKey="save">4. Save</Nav.Link>
          </Nav.Item>
        </Nav>
        {step === "foundation" && (
          <FoundationTab element={element} dispatch={dispatch} />
        )}
        {step === "reader" && (
          <ReaderTab element={element} dispatch={dispatch} />
        )}
      </Tab.Container>
    </Form>
  );
};

export default ElementWizard;
