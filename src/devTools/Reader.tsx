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

// import React, { useReducer, useCallback, useMemo } from "react";
// import AsyncSelect from "react-select/async/";
// import blockRegistry from "@/blocks/registry";
// import produce from "immer";
// import {
//   DEV_WATCH_READER,
//   DEV_WATCH_READER_READ,
// } from "@/messaging/constants";
/// import  toJsonSchema from 'to-json-schema';
// import GenerateSchema from "generate-schema";
// import ReactJson from "react-json-view";
//
// async function loadOptions() {
//   await blockRegistry.fetch();
//   return blockRegistry
//     .all()
//     .filter((x) => !!x.read)
//     .map((x) => ({
//       id: x.id,
//       value: x.id,
//       label: x.name,
//       block: x,
//     }));
// }
//
// function reducer(state, action) {
//   switch (action.type) {
//     case "SET_BLOCK": {
//       return produce(state, (draftState) => {
//         draftState.block = action.payload;
//         draftState.examples = [];
//       });
//     }
//     case "ADD_EXAMPLE": {
//       const { id, value } = action.payload;
//       return produce(state, (draftState) => {
//         if (id === state.block.id) {
//           draftState.examples.push(value);
//         }
//       });
//     }
//     default: {
//       return state;
//     }
//   }
// }
//
// const Reader = () => {
//   const [state, dispatch] = useReducer(reducer, {
//     block: undefined,
//     examples: [],
//   });
//
//   const portListener = useCallback(
//     ({ type, payload }) => {
//       switch (type) {
//         case DEV_WATCH_READER_READ: {
//           dispatch({ type: "ADD_EXAMPLE", payload });
//           break;
//         }
//         default: {
//           // pass
//         }
//       }
//     },
//     [dispatch]
//   );
//
//   const port = useContentScript(DEV_WATCH_READER_PORT, portListener);
//
//   const selectReader = useCallback(
//     (e) => {
//       dispatch({ type: "SET_BLOCK", payload: e });
//       if (port) {
//         port.postMessage({ type: DEV_WATCH_READER, payload: { id: e.value } });
//       } else {
//         console.error("Port to content script not initialized");
//       }
//     },
//     [port, dispatch]
//   );
//
//   const inferredSchema = useMemo(() => {
//     if (state.block?.label && state.examples.length > 0) {
//       const schema = GenerateSchema.json(state.block.label, state.examples);
//       console.log("Inferred schema", schema);
//       return schema.items;
//     } else {
//       return undefined;
//     }
//   }, [state.examples, state.block?.label]);
//
//   return (
//     <div>
//       <AsyncSelect
//         defaultOptions
//         loadOptions={loadOptions}
//         placeholder="Select a reader component"
//         onChange={selectReader}
//         value={state.block}
//       />
//       <div>Examples collected: {state.examples.length}</div>
//       <ReactJson src={inferredSchema} />
//     </div>
//   );
// };
//
// export default Reader;
