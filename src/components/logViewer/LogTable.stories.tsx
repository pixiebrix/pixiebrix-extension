/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

Object.assign(global, { chrome: { runtime: { id: 42 } } });

import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { validateRegistryId, uuidv4 } from "@/types/helpers";
import LogTable from "@/components/logViewer/LogTable";
import { serializeError } from "serialize-error";
import { Card } from "react-bootstrap";
import { ContextError } from "@/errors";
import { InputValidationError } from "@/blocks/errors";
import { Schema } from "@/core";
import type { LogEntry } from "@/background/logging";

export default {
  title: "Editor/LogTable",
  component: LogTable,
} as ComponentMeta<typeof LogTable>;

const Template: ComponentStory<typeof LogTable> = (args) => (
  <Card>
    <Card.Header>Error Log</Card.Header>
    <Card.Body className="p-0">
      <LogTable {...args} />
    </Card.Body>
  </Card>
);

export const NoEntries = Template.bind({});
NoEntries.args = {
  hasEntries: false,
  pageEntries: [],
};

export const NoEntriesForLevel = Template.bind({});
NoEntriesForLevel.args = {
  hasEntries: true,
  pageEntries: [],
};

const blockId = validateRegistryId("@pixiebrix/system/notification");

const DEBUG_MESSAGE: LogEntry = {
  uuid: uuidv4(),
  timestamp: Date.now().toString(),
  message: "Sample debug message",
  level: "debug",
  context: {
    blockId,
  },
};

const ERROR_MESSAGE: LogEntry = {
  uuid: uuidv4(),
  timestamp: Date.now().toString(),
  message: "Sample error running brick message",
  level: "error",
  context: {
    // Just the context that will show up in the table
    blockId,
  },
  error: serializeError(new Error("Simple error")),
};

const sampleSchema: Schema = {
  type: "object",
  properties: {
    query: {
      type: "string",
    },
  },
};

const validationError = new InputValidationError(
  "Invalid inputs for block",
  sampleSchema,
  {},
  [
    {
      error: 'Instance does not have required property "query".',
      instanceLocation: "#",
      keyword: "required",
      keywordLocation: "#/required",
    },
  ]
);

const CONTEXT_ERROR_MESSAGE: LogEntry = {
  uuid: uuidv4(),
  timestamp: Date.now().toString(),
  message: "Invalid inputs for block",
  level: "error",
  context: {
    // Just the context that will show up in the table
    blockId,
  },
  error: serializeError(
    new ContextError(validationError, {
      blockId,
    })
  ),
};

export const Populated = Template.bind({});
Populated.args = {
  hasEntries: true,
  pageEntries: [DEBUG_MESSAGE, ERROR_MESSAGE, CONTEXT_ERROR_MESSAGE],
};
