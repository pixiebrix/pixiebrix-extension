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
import React, {
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from "react";
import { DevToolsContext } from "@/devTools/context";
import {
  Button,
  Container,
  Row,
  Col,
  ListGroup,
  Badge,
  Form,
  Tab,
  Nav,
} from "react-bootstrap";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as nativeOperations from "@/background/devtools";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { noop, uniq, compact } from "lodash";
import {
  Field,
  FieldInputProps,
  Formik,
  useField,
  useFormikContext,
} from "formik";
import useAsyncEffect from "use-async-effect";
import { useDebounce } from "use-debounce";
import Creatable from "react-select/creatable";
import { OptionsType } from "react-select";

interface ButtonState {
  readonly uuid: string;
  containerSelector: string;
  containerSelectorOptions: string[];
  template: string;
  caption: string;
  position: "append" | "prepend";
}

interface EditorState {
  inserting: boolean;
  activeElement: string | null;
  readonly elements: ButtonState[];
}

const initialState: EditorState = {
  activeElement: null,
  elements: [],
  inserting: false,
};

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    toggleInsert: (state, action: PayloadAction<boolean>) => {
      state.inserting = action.payload;
    },
    addElement: (state, action: PayloadAction<ButtonState>) => {
      const element = action.payload;
      state.activeElement = element.uuid;
      state.elements.push(element);
    },
    selectElement: (state, action: PayloadAction<string>) => {
      state.activeElement = action.payload;
    },
    removeElement: (state, action: PayloadAction<string>) => {
      const uuid = action.payload;
      if (state.activeElement === uuid) {
        state.activeElement = null;
      }
      state.elements.splice(
        state.elements.findIndex((x) => x.uuid === uuid),
        1
      );
    },
  },
});

const actions = editorSlice.actions;

const SelectorSelector: React.FunctionComponent<{
  name: string;
  containerSelectorOptions: string[];
}> = ({ name, containerSelectorOptions }) => {
  const [field, , helpers] = useField(name);

  const [created, setCreated] = useState([]);

  const options: OptionsType<{ value: string }> = useMemo(() => {
    const all = uniq(
      compact([...containerSelectorOptions, ...created, field.value])
    );
    return all.map((x) => ({ value: x, label: x }));
  }, [created, containerSelectorOptions]);

  return (
    <Creatable
      options={options}
      onCreateOption={(inputValue) => {
        setCreated([...created, inputValue]);
        helpers.setValue(inputValue);
      }}
      value={options.find((x) => x.value === field.value)}
      onChange={(option) => helpers.setValue((option as any).value)}
    />
  );
};

const FoundationTab: React.FunctionComponent<{
  selectedElement: ButtonState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ selectedElement, dispatch }) => {
  const { port } = useContext(DevToolsContext);
  const { isSubmitting, isValid } = useFormikContext();

  return (
    <Tab.Pane key="foundation" eventKey="foundation">
      <Form.Group as={Row} controlId="formContainerSelector">
        <Form.Label column sm={2}>
          Container Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelector
            name="containerSelector"
            containerSelectorOptions={selectedElement.containerSelectorOptions}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formPosition">
        <Form.Label column sm={2}>
          Position
        </Form.Label>
        <Col sm={10}>
          <Field name="position">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="select" {...field}>
                <option value="append">Append</option>
                <option value="prepend">Prepend</option>
              </Form.Control>
            )}
          </Field>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formCaption">
        <Form.Label column sm={2}>
          Caption
        </Form.Label>
        <Col sm={10}>
          <Field name="caption">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formCaption">
        <Form.Label column sm={2}>
          Template
        </Form.Label>
        <Col sm={10}>
          <Field name="template">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="textarea" rows={4} {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>

      <Form.Group as={Row}>
        <Col>
          <Button
            variant="danger"
            className="mr-2"
            onClick={async () => {
              await nativeOperations.removeElement(port, {
                uuid: selectedElement.uuid,
              });
              dispatch(actions.removeElement(selectedElement.uuid));
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
            Save Button
          </Button>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

const ElementForm: React.FunctionComponent<{
  selectedElement: ButtonState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ selectedElement, dispatch }) => {
  const { port } = useContext(DevToolsContext);
  const [step, setStep] = useState("foundation");

  const { submitForm } = useFormikContext();
  const [debounced] = useDebounce(selectedElement, 100);

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
        </Nav>
        <FoundationTab selectedElement={selectedElement} dispatch={dispatch} />
      </Tab.Container>
    </Form>
  );
};

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
      dispatch(actions.addElement(button));
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
                      <ElementForm
                        dispatch={dispatch}
                        selectedElement={values}
                      />
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
