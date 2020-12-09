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

import { createSendScriptMessage } from "@/messaging/chrome";
import {
  Framework,
  GET_COMPONENT_DATA,
  GET_COMPONENT_INFO,
  SET_COMPONENT_DATA,
} from "@/messaging/constants";
import { ReaderOutput } from "@/core";
import { ElementInfo } from "@/nativeEditor/frameworks";
import { cleanValue } from "@/utils";

export type PathSpec =
  | string
  | string[]
  | Record<string, string | { path: string; args: unknown }>;

export interface ReadOptions {
  pathSpec?: PathSpec;
  waitMillis?: number;
  retryMillis?: number;
  traverseUp?: number;
  rootProp?: string;
}

export type ReadPayload = ReadOptions & {
  framework: Framework;
  selector: string;
};

export interface WritePayload {
  framework: Framework;
  selector: string;
  valueMap: { [key: string]: unknown };
}

export const setComponentData = createSendScriptMessage<void, WritePayload>(
  SET_COMPONENT_DATA
);

export const getComponentData = createSendScriptMessage<
  ReaderOutput,
  ReadPayload
>(GET_COMPONENT_DATA);

export const getElementInfo = createSendScriptMessage<
  ElementInfo,
  { selector: string; framework?: Framework; traverseUp?: number }
>(GET_COMPONENT_INFO);

type Handler = (payload: unknown) => unknown | Promise<unknown>;
type AttachHandler = (type: string, handler: Handler) => void;

const handlers: { [type: string]: Handler } = {};

export function initialize(): AttachHandler {
  window.addEventListener("message", function (event) {
    const handler = handlers[event.data?.type];

    if (!handler) {
      return;
    }

    const { meta, type, payload } = event.data;

    console.debug(`RECEIVE ${type}`, event.data);

    const reject = (error: unknown) => {
      try {
        const detail = {
          id: meta.id,
          error,
        };
        console.warn(`pageScript responding ${type}_REJECTED`, detail);
        document.dispatchEvent(
          new CustomEvent(`${type}_REJECTED`, {
            detail,
          })
        );
      } catch (err) {
        console.error(
          `An error occurred while dispatching an error for ${type}`,
          { error: err, originalError: error }
        );
      }
    };

    const fulfill = (result: unknown) => {
      let cleanResult;
      try {
        // Chrome will drop the whole detail if it contains non-serializable values, e.g., methods
        cleanResult = cleanValue(result ?? null);
      } catch (err) {
        console.error("Cannot serialize result", { result, err });
        throw new Error(`Cannot serialize result for result ${type}`);
      }

      const detail = {
        id: meta.id,
        result: cleanResult,
      };
      console.debug(`pageScript responding ${type}_FULFILLED`, detail);
      document.dispatchEvent(
        new CustomEvent(`${type}_FULFILLED`, {
          detail,
        })
      );
    };

    let resultPromise;

    try {
      resultPromise = handler(payload);
    } catch (error) {
      // handler is a function that immediately generated an error -- bail early.
      reject(error);
      return;
    }

    Promise.resolve(resultPromise).then(fulfill).catch(reject);
  });

  return (messageType: string, handler: Handler) => {
    handlers[messageType] = handler;
  };
}
