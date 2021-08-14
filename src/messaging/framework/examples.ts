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

import BackgroundActor from "@/messaging/framework/BackgroundActor";
import {
  ActionCreator,
  Message,
  Contract,
  Payload,
} from "@/messaging/framework/types";

// The type contract we can put in a shared protocol file. (The
const MESSAGE_TYPE = "EXAMPLE";
type Example = {
  type: typeof MESSAGE_TYPE;
  method: (args: { foo: number }) => Promise<number>;
};

// Example of adding a handler. Ideally it would reference the ExampleMethod. We'll have to replicate the message
// type 2x, it would be nice to figure how to not repeat it 3 times
const exampleHandler: Example["method"] = async (message: { foo: number }) =>
  message.foo;
const backgroundActor = new BackgroundActor();

// Type checks
backgroundActor.addHandler<Example>(MESSAGE_TYPE, exampleHandler);
backgroundActor.addHandler(MESSAGE_TYPE, exampleHandler);

// Does not type check
// backgroundActor.addHandler<Example>(MESSAGE_TYPE, ({bar}: {bar: string}) => 42);
// backgroundActor.addHandler(MESSAGE_TYPE, ({bar}: {bar: string}) => 42);
// backgroundActor.addHandler("NOTHINGTOSEEHERE", ({bar}: {bar: string}) => 42);

// Creating the caller/operation

// A "dumb" action creator method to perform type checking
function createAction<T extends Contract>(
  type: T["type"],
  payload: Payload<T["method"]>
): Message<string, Payload<T["method"]>> {
  return {
    type,
    payload,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const create: ActionCreator<Example> = (foo: number) => ({
  type: MESSAGE_TYPE,
  payload: { foo },
});

// const doesNotTypeCheck: ActionCreator<Example> = (bar: number) => ({
//   type: MESSAGE_TYPE,
//   payload: {bar}
// })

// const doesNotTypeCheck: ActionCreator<Example> = (bar: string) => ({
//   type: MESSAGE_TYPE,
//   payload: {bar}
// })

// Doesn't type check
// const doesNotTypeCheck = createAction<Example>(MESSAGE_TYPE, {bar: 32});

// Type checks
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const action = createAction<Example>(MESSAGE_TYPE, { foo: 32 });
