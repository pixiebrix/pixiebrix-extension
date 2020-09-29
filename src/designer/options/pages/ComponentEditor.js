import React, { useReducer, useMemo } from "react";
import { createSlice } from "@reduxjs/toolkit";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import mapValues from "lodash/mapValues";
import { connect } from "react-redux";
import blockRegistry from "@/blocks/registry";
import Select from "react-select";
import Card from "react-bootstrap/Card";
import genericOptionsFactory from "@/designer/options/fields/blockOptions";
import ErrorBoundary from "@/designer/ErrorBoundary";
import sortBy from "lodash/sortBy";
import { PageTitle } from "@/designer/options/layout/Page";
import { inputProperties } from "@/helpers";

const mapActionsToDispatch = (actions, dispatch) =>
  mapValues(actions, (action) => (...args) => dispatch(action(...args)));

const initialInputs = {
  exampleInput: {
    _sort: 0,
    type: "string",
    description: "Here's an example description",
  },
};

export const stepsSlice = createSlice({
  name: "steps",
  initialState: { steps: [] },
  reducers: {
    addStep(state, { payload: blockId }) {
      const block = blockRegistry.lookup(blockId);
      state.steps.push({
        id: blockId,
        config: block.defaultOptions,
      });
      return state;
    },
    deleteStep(state, { payload: index }) {
      state.steps.splice(index, 1);
      return state;
    },
    configureStep(state, { payload: { index, config } }) {
      console.log(config);
      state.steps[index].config = { ...state.steps[index].config, ...config };
      return state;
    },
  },
});

export const inputSlice = createSlice({
  name: "inputs",
  initialState: initialInputs,
  reducers: {
    addInput(state) {
      state[""] = {
        type: "string",
        _sort: Object.keys(state).length + 1,
      };
      return state;
    },
    deleteInput(state, { payload: field }) {
      delete state[field];
      return state;
    },
    renameInput(state, { payload: { oldName, newName } }) {
      const oldValue = state[oldName];
      delete state[oldName];
      state[newName] = oldValue;
      return state;
    },
    updateDescription(state, { payload: { field, description } }) {
      state[field].description = description;
    },
  },
});

const InputEditor = ({}) => {
  const [state, dispatch] = useReducer(inputSlice.reducer, initialInputs);
  const {
    renameInput,
    updateDescription,
    addInput,
    deleteInput,
  } = mapActionsToDispatch(inputSlice.actions, dispatch);

  return (
    <>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Required?</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {sortBy(Object.entries(state), ([, x]) => x._sort).map(
            ([field, fieldSchema]) => (
              <tr key={field}>
                <td>
                  <Form.Control
                    type="text"
                    defaultValue={field}
                    onBlur={(e) =>
                      renameInput({ oldName: field, newName: e.target.value })
                    }
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    defaultValue={fieldSchema.description}
                    onBlur={(e) =>
                      updateDescription({ field, description: e.target.value })
                    }
                  />
                </td>
                <td>
                  <Form.Check
                    type="switch"
                    id={`${field}-required`}
                    defaultValue={fieldSchema.required}
                  />
                </td>
                <td>
                  <Button variant="danger" onClick={() => deleteInput(field)}>
                    Delete
                  </Button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </Table>
      <Button onClick={addInput}>Add Input</Button>
    </>
  );
};

const StepEditor = ({ step, onDelete, onChange }) => {
  const block = useMemo(() => blockRegistry.lookup(step.id), [step.id]);
  const BlockOptions = useMemo(
    () => genericOptionsFactory(inputProperties(block.inputSchema)),
    [block]
  );

  return (
    <Card className="mt-3">
      <Card.Header>
        {block.name} - {step.id}
      </Card.Header>
      <Card.Body>
        <ErrorBoundary>
          <BlockOptions config={step.config ?? {}} updateConfig={onChange} />
        </ErrorBoundary>
      </Card.Body>
      <Card.Footer>
        <Button size="sm" variant="danger" onClick={onDelete}>
          Delete Step
        </Button>
      </Card.Footer>
    </Card>
  );
};

const ComponentEditor = ({}) => {
  const [state, dispatch] = useReducer(stepsSlice.reducer, { steps: [] });
  const { addStep, deleteStep, configureStep } = mapActionsToDispatch(
    stepsSlice.actions,
    dispatch
  );

  const blockOptions = useMemo(
    () =>
      blockRegistry.all().map((block) => ({
        value: block.id,
        label: block.name,
        block,
      })),
    []
  );

  return (
    <Form>
      <PageTitle title="Build a New Brick" />

      <Card>
        <Card.Header>Information</Card.Header>
        <Card.Body>
          <Form.Group controlId="blockName">
            <Form.Label>Name</Form.Label>
            <Form.Control type="text" defaultValue="My block" />
            <Form.Text className="text-muted">Give your brick a name</Form.Text>
          </Form.Group>

          <Form.Group controlId="blockDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              type="text"
              defaultValue="This is my brick. There are many like it, but this one is mine."
            />
            <Form.Text className="text-muted">
              Give your brick a description
            </Form.Text>
          </Form.Group>
        </Card.Body>
      </Card>

      <Card className="mt-3">
        <Card.Header>Inputs</Card.Header>
        <Card.Body>
          <Card.Subtitle>
            Define one or more inputs for your block. You can refer to these
            inputs in your components using a template variable, e.g.,{" "}
            <code>{`{{input.exampleInput}}`}</code>
          </Card.Subtitle>
          <div className="mt-3">
            <InputEditor />
          </div>
        </Card.Body>
      </Card>

      {state.steps.map((step, index) => (
        <StepEditor
          key={`${step.id}-${index}`}
          step={step}
          onChange={(config) => configureStep({ index, config })}
          onDelete={() => deleteStep(index)}
        />
      ))}
      <div className="mt-4">
        <Select
          placeholder="Search for a block"
          options={blockOptions}
          onChange={({ value }) => addStep(value)}
        />
      </div>

      <div className="mt-4">
        <Button>Save Block</Button>
      </div>
    </Form>
  );
};

export default connect()(ComponentEditor);
