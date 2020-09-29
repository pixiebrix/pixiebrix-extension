import React, { useReducer, useCallback, useMemo } from "react";
import AsyncSelect from "react-select/async/";
import blockRegistry from "@/blocks/registry";
import produce from "immer";
import { useContentScript } from "@/extensionPoints/hooks";
import {
  DEV_WATCH_READER,
  DEV_WATCH_READER_PORT,
  DEV_WATCH_READER_READ,
} from "@/messaging/constants";
// import  toJsonSchema from 'to-json-schema';
import GenerateSchema from "generate-schema";
import ReactJson from "react-json-view";

async function loadOptions() {
  await blockRegistry.fetch();
  return blockRegistry
    .all()
    .filter((x) => !!x.read)
    .map((x) => ({
      id: x.id,
      value: x.id,
      label: x.name,
      block: x,
    }));
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_BLOCK": {
      return produce(state, (draftState) => {
        draftState.block = action.payload;
        draftState.examples = [];
      });
    }
    case "ADD_EXAMPLE": {
      const { id, value } = action.payload;
      return produce(state, (draftState) => {
        if (id === state.block.id) {
          draftState.examples.push(value);
        }
      });
    }
    default: {
      return state;
    }
  }
}

const Reader = () => {
  const [state, dispatch] = useReducer(reducer, {
    block: undefined,
    examples: [],
  });

  const portListener = useCallback(
    ({ type, payload }) => {
      switch (type) {
        case DEV_WATCH_READER_READ: {
          dispatch({ type: "ADD_EXAMPLE", payload });
          break;
        }
        default: {
          // pass
        }
      }
    },
    [dispatch]
  );

  const port = useContentScript(DEV_WATCH_READER_PORT, portListener);

  const selectReader = useCallback(
    (e) => {
      dispatch({ type: "SET_BLOCK", payload: e });
      if (port) {
        port.postMessage({ type: DEV_WATCH_READER, payload: { id: e.value } });
      } else {
        console.error("Port to content script not initialized");
      }
    },
    [port, dispatch]
  );

  const inferredSchema = useMemo(() => {
    if (state.block?.label && state.examples.length > 0) {
      const schema = GenerateSchema.json(state.block.label, state.examples);
      console.log("Inferred schema", schema);
      return schema.items;
    } else {
      return undefined;
    }
  }, [state.examples, state.block?.label]);

  return (
    <div>
      <AsyncSelect
        defaultOptions
        loadOptions={loadOptions}
        placeholder="Select a reader component"
        onChange={selectReader}
        value={state.block}
      />
      <div>Examples collected: {state.examples.length}</div>
      <ReactJson src={inferredSchema} />
    </div>
  );
};

export default Reader;
