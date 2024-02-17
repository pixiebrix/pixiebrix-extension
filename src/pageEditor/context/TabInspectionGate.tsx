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
import { queryTabs } from "@/background/messenger/strict/api";
import { Button } from "react-bootstrap";
import { getErrorMessage } from "@/errors/errorHelpers";

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
    <div>
      <div>Select Tab to Inspect</div>
      {data?.map((tab) => (
        <div key={tab.id}>
          <Button
            variant="link"
            onClick={() => {
              onSelect(tab.id);
            }}
          >
            {tab.url}
          </Button>
        </div>
      ))}
    </div>
  );
};

const TabInspectionGate: React.FC = ({ children }) => {
  // TODO: handle case where the tab is closed

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
