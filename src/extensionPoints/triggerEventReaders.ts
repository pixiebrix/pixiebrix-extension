/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { Reader } from "@/types";
import { type IReader, type ReaderOutput, type Schema } from "@/core";
import { type JsonObject } from "type-fest";
import { ensureJsonObject, isObject } from "@/utils";
import { BusinessError } from "@/errors/businessErrors";
import selectionController from "@/utils/selectionController";
import {
  KEYBOARD_TRIGGERS,
  type Trigger,
} from "@/extensionPoints/triggerExtensionTypes";

export function pickEventProperties(nativeEvent: Event): JsonObject {
  if (nativeEvent instanceof KeyboardEvent) {
    // Must be kept in sync with KeyboardEventReader

    // Can't use Object.entries because they're on the prototype. Can't use lodash's pick because the type isn't
    // precise enough (per-picked property) to support the JsonObject return type.
    const { key, keyCode, metaKey, altKey, shiftKey, ctrlKey } = nativeEvent;

    return {
      key,
      keyCode,
      metaKey,
      altKey,
      shiftKey,
      ctrlKey,
    };
  }

  if (nativeEvent instanceof CustomEvent) {
    const { detail = {} } = nativeEvent;

    if (isObject(detail)) {
      // Ensure detail is a serialized/a JSON object. The custom trigger can also pick up JS custom event, which could
      // have real JS data in them (vs. a JsonObject the user has provided via our @pixiebrix/event brick)
      return ensureJsonObject(detail);
    }

    throw new BusinessError("Custom event detail is not an object");
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Document/selectionchange_event
  if (nativeEvent.type === "selectionchange") {
    // https://developer.mozilla.org/en-US/docs/Web/API/Selection
    return {
      // Match the behavior for contextMenu and quickBar
      selectionText: selectionController.get(),
    };
  }

  return {};
}

/**
 * A reader "stub" for KeyboardEvent triggers
 */
export class KeyboardEventReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/event/keyboard",
      "Keyboard Event Reader",
      "Data from a keyboard event"
    );
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async read(): Promise<ReaderOutput> {
    // The actual field is set by the extension point, not the reader
    throw new Error("KeyboardEventReader.read() should not be called directly");
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
   */
  override outputSchema: Schema = {
    type: "object",
    properties: {
      key: {
        type: "string",
        description:
          "The value of the key pressed by the user, taking into consideration the state of modifier keys such as Shift as well as the keyboard locale and layout",
      },
      keyCode: {
        type: "number",
        description:
          "Represents a system and implementation dependent numerical code identifying the unmodified value of the pressed key",
      },
      metaKey: {
        type: "boolean",
        description:
          "A boolean value that indicates if the Meta key was pressed (true) or not (false) when the event occurred",
      },
      altKey: {
        type: "boolean",
        description:
          "A boolean value that indicates if the Alt key was pressed (true) or not (false) when the event occurred",
      },
      shiftKey: {
        type: "boolean",
        description:
          "A boolean value that indicates if the Shift key was pressed (true) or not (false) when the event occurred",
      },
      ctrlKey: {
        type: "boolean",
        description:
          "A boolean value that indicates if the Ctrl key was pressed (true) or not (false) when the event occurred",
      },
    },
  };
}

/**
 * A reader "stub" for KeyboardEvent triggers
 */
export class SelectionChangedReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/event/selection",
      "Selection Changed Reader",
      "Data from a selection changed event"
    );
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async read(): Promise<ReaderOutput> {
    // The actual field is set by the extension point, not the reader
    throw new Error(
      "SelectionChangedReader.read() should not be called directly"
    );
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
   */
  override outputSchema: Schema = {
    type: "object",
    properties: {
      selectionText: {
        type: "string",
        description: "The currently selected text, if any",
      },
    },
  };
}

/**
 * A reader "stub" for KeyboardEvent triggers
 */
export class CustomEventReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/event/custom",
      "Custom Event Reader",
      "Data from a custom event"
    );
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async read(): Promise<ReaderOutput> {
    // The actual field is set by the extension point, not the reader
    throw new Error(
      "SelectionChangedReader.read() should not be called directly"
    );
  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
   */
  override outputSchema: Schema = {
    type: "object",
    properties: {},
    additionalProperties: true,
  };
}

export function getShimEventReader(trigger: Trigger): unknown {
  const reader = getEventReader(trigger);

  if (reader) {
    return {
      isAvailable: async () => true,

      outputSchema: reader.outputSchema,

      async read() {
        return "Event data not available in preview";
      },
    };
  }

  return null;
}

export function getEventReader(trigger: Trigger): IReader | null {
  if (KEYBOARD_TRIGGERS.includes(trigger)) {
    return new KeyboardEventReader();
  }

  if (trigger === "selectionchange") {
    return new SelectionChangedReader();
  }

  if (trigger === "custom") {
    return new CustomEventReader();
  }

  return null;
}
