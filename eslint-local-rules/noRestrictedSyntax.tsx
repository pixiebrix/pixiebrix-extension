/** @file File that verifies rules in `no-restricted-syntax`. Each line MUST be preceded by `eslint-disable-next-line` or "// Ok" */

// Ok
import React from "react";

// eslint-disable-next-line no-restricted-imports -- necessary to define rule
export { type AxiosRequestConfig } from "axios";

// eslint-disable-next-line no-restricted-syntax -- necessary to define rule
export const url = browser.runtime.getURL("options.html");

// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/prefer-promise-reject-errors -- necessary to define rule
void Promise.allSettled([Promise.resolve(), Promise.reject()]);

export const X = () => (
  <div
    tabIndex={0}
    role="button"
    onClick={console.log}
    onKeyPress={console.log}
  />
);

// Ok
const selection = getSelection();
// eslint-disable-next-line no-restricted-syntax -- necessary to define rule
export const range = selection?.getRangeAt(0).startContainer;

// This should be allowed
export const string = selection?.toString();
