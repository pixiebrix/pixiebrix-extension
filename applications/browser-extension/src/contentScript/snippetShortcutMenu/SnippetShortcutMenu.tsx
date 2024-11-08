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
import useSnippetShortcutRegistry from "./useSnippetShortcutRegistry";
import { type TextEditorElement } from "../../types/inputTypes";
import useKeyboardQuery from "./useKeyboardQuery";
import cx from "classnames";
import stylesUrl from "./SnippetShortcutMenu.scss?loadAsUrl";
import {
  initialState,
  snippetShortcutMenuSlice,
  type MenuState,
  selectSelectedSnippetShortcut,
} from "./snippetShortcutMenuSlice";
import { getElementText } from "../../utils/editorUtils";
import { isEmpty } from "lodash";
import reportEvent from "../../telemetry/reportEvent";
import { Events } from "../../telemetry/events";
import EmotionShadowRoot from "../../components/EmotionShadowRoot";
import { Stylesheets } from "../../components/Stylesheets";
import useIsMounted from "../../hooks/useIsMounted";
import {
  normalizePreview,
  replaceAtCommandKey,
} from "./snippetShortcutUtils";
import type { SnippetShortcut } from "../../platform/platformTypes/snippetShortcutMenuProtocol";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretUp,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import type SnippetRegistry from "./snippetShortcutRegistry";

type MenuActionCallbacks = {
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
  snippet: SnippetShortcut;
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
  activeSnippetShortcut?: MenuState["activeSnippetShortcut"];
  results: MenuState["results"];
}> = ({ activeSnippetShortcut, results }) => {
  if (activeSnippetShortcut?.state.isFetching) {
    return (
      <div role="status" className="status status--fetching">
        Running shortcut snippet: {activeSnippetShortcut.snippetShortcut.title}
      </div>
    );
  }

  if (activeSnippetShortcut?.state.isError) {
    return (
      <div role="status" className="status status--error">
        Error running last shortcut snippet
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

const menuFooter: React.ReactElement = (
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

const SnippetShortcutMenu: React.FunctionComponent<
  {
    commandKey: string;
    registry: SnippetRegistry;
    element: TextEditorElement;
  } & MenuActionCallbacks
> = ({ commandKey, registry, element, onHide }) => {
  const isMounted = useIsMounted();
  const [state, dispatch] = useReducer(
    snippetShortcutMenuSlice.reducer,
    initialState,
  );
  const selectedSnippetShortcut = selectSelectedSnippetShortcut(state);
  const selectedSnippetShortcutRef = useRef(selectedSnippetShortcut);
  const snippetShortcuts = useSnippetShortcutRegistry(registry);

  const fillAtCursor = useCallback(
    async ({
      snippetShortcut,
      query,
    }: {
      snippetShortcut: SnippetShortcut;
      query: string;
    }) => {
      // Async thunks don't work with React useReducer so write async logic as a hook
      // https://github.com/reduxjs/redux-toolkit/issues/754
      dispatch(
        snippetShortcutMenuSlice.actions.setSnippetShortcutLoading({
          snippetShortcut,
        }),
      );
      try {
        reportEvent(Events.SHORTCUT_SNIPPET_RUN, snippetShortcut.context);
        const text = await snippetShortcut.handler(getElementText(element));
        await replaceAtCommandKey({ commandKey, query, element, text });
        onHide();
        if (isMounted()) {
          // We're setting success state for Storybook. In practice, the menu will be unmounted via onHide()
          dispatch(
            snippetShortcutMenuSlice.actions.setSnippetShortcutSuccess({
              text,
            }),
          );
        }
      } catch (error) {
        console.warn("Error filling at cursor", error);
        dispatch(
          snippetShortcutMenuSlice.actions.setSnippetShortcutError({ error }),
        );
      }
    },
    [element, commandKey, onHide, dispatch, isMounted],
  );

  const query = useKeyboardQuery({
    element,
    commandKey,
    // OK to pass handlers directly because hook uses useRef
    async onSubmit(query) {
      if (selectedSnippetShortcutRef.current != null) {
        await fillAtCursor({
          snippetShortcut: selectedSnippetShortcutRef.current,
          query,
        });
      }
    },
    onOffset(offset: number) {
      dispatch(
        snippetShortcutMenuSlice.actions.offsetSelectedIndex({ offset }),
      );
    },
  });

  useEffect(() => {
    // Auto-hide if the user deletes the commandKey
    if (selectedSnippetShortcutRef.current && query == null) {
      onHide();
    }

    // Make current value available to onSubmit handler for useKeyboardQuery
    selectedSnippetShortcutRef.current = selectedSnippetShortcut;
  }, [selectedSnippetShortcut, query, onHide]);

  // Search effect
  useEffect(() => {
    dispatch(
      snippetShortcutMenuSlice.actions.search({
        snippetShortcuts,
        query,
      }),
    );
  }, [query, snippetShortcuts, dispatch]);

  return (
    // Prevent page styles from leaking into the menu
    <EmotionShadowRoot mode="open" style={{ all: "initial" }}>
      <Stylesheets href={[stylesUrl]}>
        <div role="menu" aria-label="Shortcut Snippet Menu" className="root">
          <StatusBar {...state} />
          <div className="results">
            {state.results.length === 0 && noResultsPane}

            {state.results.map((snippet) => {
              const isSelected =
                selectedSnippetShortcut?.shortcut === snippet.shortcut;
              return (
                <ResultItem
                  key={snippet.shortcut}
                  snippet={snippet}
                  disabled={
                    state.activeSnippetShortcut?.state.isFetching ?? false
                  }
                  isSelected={isSelected}
                  commandKey={commandKey}
                  query={state.query ?? ""}
                  onClick={async () => {
                    await fillAtCursor({
                      snippetShortcut: snippet,
                      query: query ?? "",
                    });
                  }}
                />
              );
            })}
          </div>
          {menuFooter}
        </div>
      </Stylesheets>
    </EmotionShadowRoot>
  );
};

export default SnippetShortcutMenu;
