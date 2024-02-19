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

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import type CommandRegistry from "@/contentScript/commandPopover/CommandRegistry";
import type { TextCommand } from "@/contentScript/commandPopover/CommandRegistry";
import useCommandRegistry from "@/contentScript/commandPopover/useCommandRegistry";
import { type HTMLTextEditorElement } from "@/types/inputTypes";
import useKeyboardQuery from "@/contentScript/commandPopover/useKeyboardQuery";
import cx from "classnames";
import "./CommandPopover.scss";
import {
  initialState,
  popoverSlice,
  selectSelectedCommand,
} from "@/contentScript/commandPopover/commandPopoverSlice";
import {
  getElementText,
  replaceAtCommand,
} from "@/contentScript/commandPopover/editorUtils";
import { truncate } from "lodash";
import { getErrorMessage } from "@/errors/errorHelpers";

type PopoverActionCallbacks = {
  onHide: () => void;
};

const CommandPopover: React.FunctionComponent<
  {
    commandKey?: string;
    registry: CommandRegistry;
    element: HTMLTextEditorElement;
  } & PopoverActionCallbacks
> = ({ commandKey = "/", registry, element, onHide }) => {
  const [state, dispatch] = useReducer(popoverSlice.reducer, initialState);
  const selectedCommand = selectSelectedCommand(state);
  const selectedCommandRef = useRef(selectedCommand);
  const commands = useCommandRegistry(registry);

  const fillAtCursor = useCallback(
    async (command: TextCommand) => {
      // Async thunks don't work with React useReducer so write async logic as a hook
      // https://github.com/reduxjs/redux-toolkit/issues/754
      dispatch(popoverSlice.actions.setCommandLoading({ command }));
      try {
        const text = await command.handler(getElementText(element));
        await replaceAtCommand({ commandKey, element, text });
        dispatch(popoverSlice.actions.setCommandSuccess({ text }));
        onHide();
      } catch (error) {
        dispatch(popoverSlice.actions.setCommandError({ error }));
      }
    },
    [element, commandKey, onHide, dispatch],
  );

  const query = useKeyboardQuery({
    element,
    commandKey,
    // OK to pass handlers directly because hook uses useRef
    async onSubmit() {
      if (selectedCommandRef.current != null) {
        await fillAtCursor(selectedCommandRef.current);
      }
    },
    onOffset(offset: number) {
      dispatch(popoverSlice.actions.offsetSelectedIndex({ offset }));
    },
  });

  // Make current value available to onSubmit handler for useKeyboardQuery
  useEffect(() => {
    selectedCommandRef.current = selectedCommand;
  }, [selectedCommand]);

  // Search effect
  useEffect(() => {
    dispatch(popoverSlice.actions.search({ commands, query }));
  }, [query, commands, dispatch]);

  return (
    <div role="menu" aria-label="Text command menu">
      {state.activeCommand?.state.isLoading && (
        <span className="text-info">
          Running command: {state.activeCommand.command.title}
        </span>
      )}
      {state.activeCommand?.state.isError && (
        <span className="text-danger">
          Error running command:{" "}
          {truncate(getErrorMessage(state.activeCommand.state.error), {
            length: 25,
          })}
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
          <span className="text-muted">No snippets/commands found</span>
        )}
      </div>
    </div>
  );
};

export default CommandPopover;
