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
import type SnippetRegistry from "@/contentScript/shortcutSnippetMenu/ShortcutSnippetRegistry";
import useCommandRegistry from "@/contentScript/shortcutSnippetMenu/useShortcutSnippetRegistry";
import { type TextEditorElement } from "@/types/inputTypes";
import useKeyboardQuery from "@/contentScript/shortcutSnippetMenu/useKeyboardQuery";
import cx from "classnames";
import stylesUrl from "./ShortcutSnippetMenu.scss?loadAsUrl";
import {
  initialState,
  popoverSlice,
  type PopoverState,
  selectSelectedCommand,
} from "@/contentScript/shortcutSnippetMenu/shortcutSnippetMenuSlice";
import { getElementText } from "@/utils/editorUtils";
import { isEmpty } from "lodash";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import { Stylesheets } from "@/components/Stylesheets";
import useIsMounted from "@/hooks/useIsMounted";
import {
  normalizePreview,
  replaceAtCommand,
} from "@/contentScript/shortcutSnippetMenu/shortcutSnippetUtils";
import type { ShortcutSnippet } from "@/platform/platformTypes/shortcutSnippetMenuProtocol";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretUp,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

type PopoverActionCallbacks = {
  onHide: () => void;
};

const SnippetTitle: React.FunctionComponent<{
  query: string;
  shortcut: string;
  commandKey: string;
}> = ({ query, shortcut, commandKey }) => (
  <div>
    {commandKey}
    {!isEmpty(query) && (
      // Highlight the match. Use the shortcut vs. query directly because search is case-insensitive
      <span className="result__match">{shortcut.slice(0, query.length)}</span>
    )}
    {shortcut.slice(query.length)}
  </div>
);

const ResultItem: React.FunctionComponent<{
  snippet: ShortcutSnippet;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
  commandKey: string;
  query: string;
}> = ({ isSelected, disabled, snippet, onClick, query, commandKey }) => {
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
      key={snippet.shortcut}
      aria-label={snippet.title}
      title={snippet.title}
      role="menuitem"
      className={cx("result", { "result--selected": isSelected })}
      onClick={onClick}
    >
      <SnippetTitle
        query={query}
        shortcut={snippet.shortcut}
        commandKey={commandKey}
      />
      <div className="result__preview">{normalizePreview(snippet.preview)}</div>
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

  return null;
};

const noResultsPane: React.ReactElement = (
  <div className="noResults">
    <div>
      <div>
        <FontAwesomeIcon icon={faExclamationCircle} />
      </div>
      <div>{"We couldn't find any matching snippets"}</div>
    </div>
  </div>
);

const popoverFooter: React.ReactElement = (
  // TODO: determine a11y: https://github.com/pixiebrix/pixiebrix-extension/issues/7936
  <div className="footer">
    Navigate{" "}
    <span className="key">
      <FontAwesomeIcon icon={faCaretDown} fixedWidth size="xs" />
      &nbsp;
      <FontAwesomeIcon icon={faCaretUp} fixedWidth size="xs" />
    </span>{" "}
    Insert <span className="key">Enter</span>
  </div>
);

const ShortcutSnippetMenu: React.FunctionComponent<
  {
    commandKey: string;
    registry: SnippetRegistry;
    element: TextEditorElement;
  } & PopoverActionCallbacks
> = ({ commandKey, registry, element, onHide }) => {
  const isMounted = useIsMounted();
  const [state, dispatch] = useReducer(popoverSlice.reducer, initialState);
  const selectedCommand = selectSelectedCommand(state);
  const selectedCommandRef = useRef(selectedCommand);
  const commands = useCommandRegistry(registry);

  const fillAtCursor = useCallback(
    async ({ command, query }: { command: ShortcutSnippet; query: string }) => {
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
        console.warn("Error filling at cursor", error);
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
    // Prevent page styles from leaking into the menu
    <EmotionShadowRoot mode="open" style={{ all: "initial" }}>
      <Stylesheets href={[stylesUrl]}>
        <div role="menu" aria-label="Text command menu" className="root">
          <StatusBar {...state} />
          <div className="results">
            {state.results.length === 0 && noResultsPane}

            {state.results.map((command) => {
              const isSelected = selectedCommand?.shortcut === command.shortcut;
              return (
                <ResultItem
                  key={command.shortcut}
                  snippet={command}
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
          {popoverFooter}
        </div>
      </Stylesheets>
    </EmotionShadowRoot>
  );
};

export default ShortcutSnippetMenu;
