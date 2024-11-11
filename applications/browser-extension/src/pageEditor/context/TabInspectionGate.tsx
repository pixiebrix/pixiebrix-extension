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

import React, { useEffect, useState } from "react";
import {
  setInspectedTabId,
  inspectedTab,
} from "@/pageEditor/context/connection";
import useAsyncState from "@/hooks/useAsyncState";
import { queryTabs } from "@/background/messenger/api";
import { Button } from "react-bootstrap";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type EmptyObject } from "type-fest";

/**
 * Tab inspection selection component.
 */
const TabSelector: React.FC<{ onSelect: (tabId: number) => void }> = ({
  onSelect,
}) => {
  const { data, error } = useAsyncState(
    async () =>
      queryTabs({
        url: "*://*/*",
      }),
    [],
  );

  if (error) {
    return <div>Error Querying Tabs: {getErrorMessage(error)}</div>;
  }

  return (
    <div className="p-3">
      <div>Select Tab to Inspect</div>
      {// Exclude tabs without an id, e.g., devtools and app tabs
      data
        ?.filter((tab) => tab.id != null)
        .map((tab) => (
          <div key={tab.id}>
            <Button
              data-testid={`tab-${tab.url}`}
              variant="link"
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above
                onSelect(tab.id!);
              }}
            >
              {tab.title} - {tab.url}
            </Button>
          </div>
        ))}
    </div>
  );
};

/**
 * A gate that ensure the Page Editor is pointed to a tab. Introduced to enable running the Page Editor outside
 * the devtools, e.g., in E2E tests.
 *
 * - Does not check if the tab exists
 * - Does not check that PixieBrix has access to the tab
 * - Does not watch for the tab closing.
 *
 * @since 1.8.10
 */
const TabInspectionGate: React.FC<React.PropsWithChildren<EmptyObject>> = ({
  children,
}) => {
  const [showTabSelector, setShowTabSelector] = useState(false);

  useEffect(() => {
    if (inspectedTab.tabId === 0) {
      setShowTabSelector(true);
    }
  }, [setShowTabSelector]);

  if (showTabSelector) {
    return (
      <TabSelector
        onSelect={(tabId) => {
          const href = new URL(location.href);
          href.searchParams.set("tabId", tabId.toString());
          history.pushState({}, "", href.toString());

          setInspectedTabId(tabId);
          setShowTabSelector(false);
        }}
      />
    );
  }

  return <>{children}</>;
};

export default TabInspectionGate;
