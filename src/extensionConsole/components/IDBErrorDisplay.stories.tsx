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

import React from "react";
import { type ComponentStory, type ComponentMeta } from "@storybook/react";

import IDBErrorDisplay from "@/extensionConsole/components/IDBErrorDisplay";
import { getErrorMessage } from "@/errors/errorHelpers";

export default {
  title: "ExtensionConsole/IDBErrorDisplay",
  component: IDBErrorDisplay,
} as ComponentMeta<typeof IDBErrorDisplay>;

const Template: ComponentStory<typeof IDBErrorDisplay> = (args) => (
  <IDBErrorDisplay {...args} />
);

const normalError = new Error("This is a normal error");
const quotaError = new Error(
  "Encountered full disk while opening backing store for indexedDB.open."
);
const connectionError = new Error("Error Opening IndexedDB");
// Hard-code a stack because the stack includes the file path on local/CI builds, so Storyshots will fail
const stack =
  "ContextError: Encountered full disk while opening backing store for indexedDB.open.\nat k (chrome-extension://my-chrome-extension-id/bundles/85282.bundle.js:2:35318)\n at $ (chrome-extension://my-chrome-extension-id/bundles/85282.bundle.js:2:36577)\n at async L.runExtension (chrome-extension://my-chrome-extension-id/bundles/contentScriptCore.bundle.js:1:220194)";

export const NormalError = Template.bind({});
NormalError.args = {
  error: normalError,
  errorMessage: getErrorMessage(normalError),
  stack,
  hasError: true,
};

export const QuotaError = Template.bind({});
QuotaError.args = {
  error: quotaError,
  errorMessage: getErrorMessage(quotaError),
  stack,
  hasError: true,
};

export const ConnectionError = Template.bind({});
ConnectionError.args = {
  error: connectionError,
  errorMessage: getErrorMessage(connectionError),
  stack,
  hasError: true,
};
