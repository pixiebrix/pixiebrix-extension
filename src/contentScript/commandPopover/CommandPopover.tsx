/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useCallback, useEffect, useReducer } from "react";
import type CommandRegistry from "@/contentScript/commandPopover/CommandRegistry";
import type { TextCommand } from "@/contentScript/commandPopover/CommandRegistry";
import useCommandRegistry from "@/contentScript/commandPopover/useCommandRegistry";
import {
  type HTMLTextEditorElement,
  isBasicTextField,
} from "@/types/inputTypes";
import useCommandQuery from "@/contentScript/commandPopover/useCommandQuery";
import cx from "classnames";
import "./CommandPopover.scss";
import {
  initialState,
  popoverSlice,
  selectSelectedResult,
} from "@/contentScript/commandPopover/commandPopoverSlice";

type PopoverActionCallbacks = {
  onHide: () => void;
};

/**
 * Returns the current text content of the element to pass to the command handler
 * @param element the text editor element
 */
// In the future, we might decide to only return text up to the cursor position, or provide both full and prior text
function getElementText(element: HTMLTextEditorElement): string {
  if (isBasicTextField(element)) {
    return element.value;
  }

  return $(element).text();
}

const CommandPopover: React.FunctionComponent<
  {
    commandKey?: string;
    registry: CommandRegistry;
    element: HTMLTextEditorElement;
  } & PopoverActionCallbacks
> = ({ commandKey = "/", registry, element, onHide }) => {
  const [state, dispatch] = useReducer(popoverSlice.reducer, initialState);
  const commands = useCommandRegistry(registry);

  const fillAtCursor = useCallback(
    async (command: TextCommand) => {
      // Async thunks don't work with React useReducer so write as a hook
      // https://github.com/reduxjs/redux-toolkit/issues/754
      try {
        dispatch(popoverSlice.actions.commandRun({ command }));
        const text = await command.handler(getElementText(element));
        element.focus();
        // TODO: delete the current word that contains the commandKey and fire onChange
        document.execCommand("insertText", false, text);
        onHide();
      } catch (error) {
        dispatch(popoverSlice.actions.setCommandRejected({ error }));
      }
    },
    [element, onHide, dispatch],
  );

  const onSelect = useCallback(async () => {
    // FIXME: this might be returning null?
    await fillAtCursor(selectSelectedResult(state));
  }, [state, fillAtCursor]);

  const onOffset = useCallback(
    (offset: number) => {
      dispatch(popoverSlice.actions.offsetSelectedIndex({ offset }));
    },
    [dispatch],
  );

  const query = useCommandQuery({
    element,
    onHide,
    commandKey: "/",
    onSelect,
    onOffset,
  });

  // Search effect
  useEffect(() => {
    dispatch(popoverSlice.actions.search({ commands, query }));
  }, [query, commands, dispatch]);

  const selectedCommand = selectSelectedResult(state);

  return (
    <div role="menu" aria-label="Text command menu">
      <p>Command Popover: {query}</p>
      {state.activeCommand?.state.isLoading && (
        <span className="text-info">Running command...</span>
      )}
      {state.activeCommand?.state.isError && (
        <span className="text-error">
          Error running {state.activeCommand.command.title}
        </span>
      )}

      <div className="results">
        {state.results.map((command) => {
          const isSelected = selectedCommand?.shortcut === command.shortcut;
          return (
            <button
              key={command.shortcut}
              aria-label={command.title}
              role="menuitem"
              className={cx("result", { "result--selected": isSelected })}
              onClick={async () => {
                await fillAtCursor(command);
              }}
            >
              {commandKey}
              {command.shortcut}
            </button>
          );
        })}
        {state.results.length === 0 && (
          <span className="text-muted">No commands found</span>
        )}
      </div>
    </div>
  );
};

export default CommandPopover;
