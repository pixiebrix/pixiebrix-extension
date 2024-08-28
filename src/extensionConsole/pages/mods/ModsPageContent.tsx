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

import React from "react";
import ListView from "@/extensionConsole/pages/mods/listView/ListView";
import GridView from "@/extensionConsole/pages/mods/gridView/GridView";
import { useSelector } from "react-redux";
import {
  selectActiveTab,
  selectIsLoadingData,
  selectView,
} from "@/extensionConsole/pages/mods/modsPageSelectors";
import OnboardingView from "@/extensionConsole/pages/mods/onboardingView/OnboardingView";
import EmptyView from "@/extensionConsole/pages/mods/emptyView/EmptyView";
import GetStartedView from "@/extensionConsole/pages/mods/GetStartedView";
import { type ModsPageContentProps } from "@/extensionConsole/pages/mods/modsPageTypes";
import Loader from "@/components/Loader";

const ModsPageContent: React.VoidFunctionComponent<ModsPageContentProps> = ({
  tableInstance,
  width,
  height,
}) => {
  const view = useSelector(selectView);
  const activeTab = useSelector(selectActiveTab);
  const isLoadingTableData = useSelector(selectIsLoadingData);

  const {
    state: { globalFilter },
    rows,
  } = tableInstance;

  const ModsView = view === "list" ? ListView : GridView;

  if (activeTab.key === "Get Started") {
    return <GetStartedView width={width} height={height} />;
  }

  if (isLoadingTableData) {
    return (
      // Loader looks better if it's more central on the page vs centered on the table UI area
      <div style={{ width: 0.8 * width, height, marginRight: "20%" }}>
        <Loader />
      </div>
    );
  }

  if (rows.length > 0) {
    return (
      <ModsView tableInstance={tableInstance} width={width} height={height} />
    );
  }

  if (globalFilter) {
    return (
      <EmptyView tableInstance={tableInstance} height={height} width={width} />
    );
  }

  // If there is no set table filter and the table rows (mods) are still empty, show the onboarding view
  return <OnboardingView width={width} height={height} />;
};

export default ModsPageContent;
