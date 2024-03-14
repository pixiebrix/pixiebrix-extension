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

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
} from "react";
import type CommandRegistry from "@/contentScript/commandPopover/CommandRegistry";
import useCommandRegistry from "@/contentScript/commandPopover/useCommandRegistry";
import { type TextEditorElement } from "@/types/inputTypes";
import useKeyboardQuery from "@/contentScript/commandPopover/useKeyboardQuery";
import cx from "classnames";
import stylesUrl from "./CommandPopover.scss?loadAsUrl";
import {
  initialState,
  popoverSlice,
  type PopoverState,
  selectSelectedCommand,
} from "@/contentScript/commandPopover/commandPopoverSlice";
import { getElementText } from "@/utils/editorUtils";
import { isEmpty } from "lodash";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import { Stylesheets } from "@/components/Stylesheets";
import useIsMounted from "@/hooks/useIsMounted";
import { replaceAtCommand } from "@/contentScript/commandPopover/commandUtils";
import type { TextCommand } from "@/platform/platformTypes/commandPopoverProtocol";

type PopoverActionCallbacks = {
  onHide: () => void;
};

const CommandTitle: React.FunctionComponent<{
  query: string;
  shortcut: string;
  commandKey: string;
}> = ({ query, shortcut, commandKey }) => (
  <span>
    {commandKey}
    {!isEmpty(query) && (
      <span className="result__match">{shortcut.slice(0, query.length)}</span>
    )}
    {shortcut.slice(query.length)}
  </span>
);

const ResultItem: React.FunctionComponent<{
  command: TextCommand;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
  commandKey: string;
  query: string;
}> = ({ isSelected, disabled, command, onClick, query, commandKey }) => {
  const elementRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll as the user navigates with the arrow keys
  useLayoutEffect(() => {
    if (isSelected) {
      elementRef.current?.scrollIntoViewIfNeeded();
    }
  }, [elementRef, isSelected]);

  return (
    <button
      ref={elementRef}
      disabled={disabled}
      key={command.shortcut}
      aria-label={command.title}
      title={command.title}
      role="menuitem"
      className={cx("result", { "result--selected": isSelected })}
      onClick={onClick}
    >
      <CommandTitle
        query={query}
        shortcut={command.shortcut}
        commandKey={commandKey}
      />
    </button>
  );
};

const StatusBar: React.FunctionComponent<{
  activeCommand?: PopoverState["activeCommand"];
  results: PopoverState["results"];
}> = ({ activeCommand, results }) => {
  if (activeCommand?.state.isFetching) {
    return (
      <div role="status" className="status status--fetching">
        Running command: {activeCommand.command.title}
      </div>
    );
  }

  if (activeCommand?.state.isError) {
    return (
      <div role="status" className="status status--error">
        Error running last command
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div role="status" className="status status--empty">
        No matches found
      </div>
    );
  }

  return null;
};

const CommandPopover: React.FunctionComponent<
  {
    commandKey: string;
    registry: CommandRegistry;
    element: TextEditorElement;
  } & PopoverActionCallbacks
> = ({ commandKey, registry, element, onHide }) => {
  const isMounted = useIsMounted();
  const [state, dispatch] = useReducer(popoverSlice.reducer, initialState);
  const selectedCommand = selectSelectedCommand(state);
  const selectedCommandRef = useRef(selectedCommand);
  const commands = useCommandRegistry(registry);

  const fillAtCursor = useCallback(
    async ({ command, query }: { command: TextCommand; query: string }) => {
      // Async thunks don't work with React useReducer so write async logic as a hook
      // https://github.com/reduxjs/redux-toolkit/issues/754
      dispatch(popoverSlice.actions.setCommandLoading({ command }));
      try {
        reportEvent(Events.TEXT_COMMAND_RUN);
        const text = await command.handler(getElementText(element));
        await replaceAtCommand({ commandKey, query, element, text });
        onHide();
        if (isMounted()) {
          // We're setting success state for Storybook. In practice, the popover will be unmounted via onHide()
          dispatch(popoverSlice.actions.setCommandSuccess({ text }));
        }
      } catch (error) {
        dispatch(popoverSlice.actions.setCommandError({ error }));
      }
    },
    [element, commandKey, onHide, dispatch, isMounted],
  );

  const query = useKeyboardQuery({
    element,
    commandKey,
    // OK to pass handlers directly because hook uses useRef
    async onSubmit(query) {
      if (selectedCommandRef.current != null) {
        await fillAtCursor({ command: selectedCommandRef.current, query });
      }
    },
    onOffset(offset: number) {
      dispatch(popoverSlice.actions.offsetSelectedIndex({ offset }));
    },
  });

  useEffect(() => {
    // Auto-hide if the user deletes the commandKey
    if (selectedCommandRef.current && query == null) {
      onHide();
    }

    // Make current value available to onSubmit handler for useKeyboardQuery
    selectedCommandRef.current = selectedCommand;
  }, [selectedCommand, query, onHide]);

  // Search effect
  useEffect(() => {
    dispatch(popoverSlice.actions.search({ commands, query }));
  }, [query, commands, dispatch]);

  return (
    <EmotionShadowRoot mode="open">
      <Stylesheets href={[stylesUrl]}>
        <div role="menu" aria-label="Text command menu" className="root">
          <StatusBar {...state} />
          <div className="results">
            {state.results.map((command) => {
              const isSelected = selectedCommand?.shortcut === command.shortcut;
              return (
                <ResultItem
                  key={command.shortcut}
                  command={command}
                  disabled={state.activeCommand?.state.isFetching ?? false}
                  isSelected={isSelected}
                  commandKey={commandKey}
                  query={state.query ?? ""}
                  onClick={async () => {
                    await fillAtCursor({ command, query: query ?? "" });
                  }}
                />
              );
            })}
          </div>
        </div>
      </Stylesheets>
    </EmotionShadowRoot>
  );
};

export default CommandPopover;
