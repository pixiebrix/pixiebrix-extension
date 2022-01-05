/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { forwardRef, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Action,
  ActionId,
  ActionImpl,
  KBarAnimator,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
  VisualState,
} from "kbar";
import ReactShadowRoot from "react-shadow-root";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import faStyleSheet from "@fortawesome/fontawesome-svg-core/styles.css?loadAsUrl";
import { expectContext } from "@/utils/expectContext";
import { once } from "lodash";
import { NOFICATIONS_Z_INDEX } from "@/common";
import { useEventListener } from "@/hooks/useEventListener";

/**
 * Set to true if the KBar should be displayed on initial mount (i.e., because it was triggered by the
 * shortcut giving the page activeTab).
 */
let autoShow = false;

/**
 * Window event name to programmatically trigger quickbar
 */
const QUICKBAR_EVENT_NAME = "pixiebrix-quickbar";

const theme = {
  background: "rgb(252, 252, 252)",
  foreground: "rgb(28, 28, 29)",
  shadow: "0px 6px 20px rgba(0, 0, 0, 20%)",
  a1: "rgba(0, 0, 0, 0.05)",
  a2: "rgba(0, 0, 0, 0.1)",
};

const searchStyle = {
  padding: "12px 16px",
  fontSize: "16px",
  width: "100%",
  boxSizing: "border-box" as React.CSSProperties["boxSizing"],
  outline: "none",
  border: "none",
  background: theme.background,
  color: theme.foreground,
};

const animatorStyle = {
  maxWidth: "600px",
  width: "100%",
  background: theme.background,
  color: theme.foreground,
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: theme.shadow,
};

const groupNameStyle = {
  padding: "8px 16px",
  fontSize: "10px",
  textTransform: "uppercase" as const,
  opacity: 0.5,
};

const ResultItem = forwardRef(
  (
    {
      action,
      active,
      currentRootActionId,
    }: {
      action: ActionImpl;
      active: boolean;
      currentRootActionId: ActionId;
    },
    ref: React.Ref<HTMLDivElement>
  ) => {
    const ancestors = React.useMemo(() => {
      if (!currentRootActionId) return action.ancestors;
      const index = action.ancestors.findIndex(
        (ancestor) => ancestor.id === currentRootActionId
      );
      // +1 removes the currentRootAction; e.g.
      // if we are on the "Set theme" parent action,
      // the UI should not display "Set theme… > Dark"
      // but rather just "Dark"
      return action.ancestors.slice(index + 1);
    }, [action.ancestors, currentRootActionId]);

    return (
      <div
        ref={ref}
        style={{
          padding: "12px 16px",
          background: active ? theme.a1 : "transparent",
          borderLeft: `2px solid ${active ? theme.foreground : "transparent"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            fontSize: 14,
          }}
        >
          {action.icon && action.icon}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div>
              {ancestors.length > 0 &&
                ancestors.map((ancestor) => (
                  <React.Fragment key={ancestor.id}>
                    <span
                      style={{
                        opacity: 0.5,
                        marginRight: 8,
                      }}
                    >
                      {ancestor.name}
                    </span>
                    <span
                      style={{
                        marginRight: 8,
                      }}
                    >
                      &rsaquo;
                    </span>
                  </React.Fragment>
                ))}
              <span>{action.name}</span>
            </div>
            {action.subtitle && (
              <span style={{ fontSize: 12 }}>{action.subtitle}</span>
            )}
          </div>
        </div>
        {action.shortcut?.length ? (
          <div
            aria-hidden
            style={{ display: "grid", gridAutoFlow: "column", gap: "4px" }}
          >
            {action.shortcut.map((sc: string) => (
              <kbd
                key={sc}
                style={{
                  padding: "4px 6px",
                  background: "rgba(0 0 0 / .1)",
                  borderRadius: "4px",
                  fontSize: 14,
                }}
              >
                {sc}
              </kbd>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
);

ResultItem.displayName = "ResultItem";

const RenderResults: React.FC = () => {
  const { results, rootActionId } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div style={groupNameStyle}>{item}</div>
        ) : (
          <ResultItem
            action={item}
            active={active}
            currentRootActionId={rootActionId}
          />
        )
      }
    />
  );
};

// Modeled around KBarPortal https://github.com/timc1/kbar/blob/a232f3d8976a61eeeb844152dea25a23a76ad368/src/KBarPortal.tsx
const KBarToggle: React.FC = (props) => {
  const { showing } = useKBar((state) => ({
    showing: state.visualState !== VisualState.hidden,
  }));

  if (!showing) {
    return null;
  }

  return <>{props.children}</>;
};

function useActions(): void {
  const { query } = useKBar();

  useEffect(() => {
    const handler = (actions: Action[]) => {
      query.registerActions(actions as any);
    };

    quickBarRegistry.addListener(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount; query will be defined on initial mount
  }, []);
}

function useAutoShow(): void {
  const { query } = useKBar();

  useEventListener(QUICKBAR_EVENT_NAME, () => {
    query.toggle();
  });

  useEffect(() => {
    if (autoShow) {
      query.toggle();
      autoShow = false;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount; query will be defined on initial mount
  }, []);
}

const AutoShow: React.FC = () => {
  useAutoShow();
  return null;
};

const KBarComponent: React.FC = () => {
  useActions();

  return (
    // Like notifications, this is temporary UI that must appear above everything
    <KBarPositioner style={{ zIndex: NOFICATIONS_Z_INDEX }}>
      <KBarAnimator style={animatorStyle}>
        <KBarSearch style={searchStyle} />
        <RenderResults />
      </KBarAnimator>
    </KBarPositioner>
  );
};

const QuickBarApp: React.FC = () => (
  <ReactShadowRoot>
    <link rel="stylesheet" href={faStyleSheet} />
    <KBarProvider actions={quickBarRegistry.actions}>
      <AutoShow />
      <KBarToggle>
        <KBarComponent />
      </KBarToggle>
    </KBarProvider>
  </ReactShadowRoot>
);

export const toggleQuickBar = () => {
  // There's a race between when this method will run and when initQuickBarApp will be run from the quickbar
  // extension point. So, use autoShow to handle case where we call initQuickBarApp first, and dispatchEvent
  // for the case where QuickBarApp is already on the page
  autoShow = true;
  initQuickBarApp();

  window.dispatchEvent(new Event(QUICKBAR_EVENT_NAME));
};

export const initQuickBarApp = once(() => {
  expectContext("contentScript");

  const container = document.createElement("div");
  document.body.prepend(container);
  ReactDOM.render(<QuickBarApp />, container);

  console.debug("Initialized quick bar");
});
