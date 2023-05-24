/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import ListView from "@/extensionConsole/pages/blueprints/listView/ListView";
import GridView from "@/extensionConsole/pages/blueprints/gridView/GridView";
import { useSelector } from "react-redux";
import {
  selectActiveTab,
  selectView,
} from "@/extensionConsole/pages/blueprints/blueprintsSelectors";
import OnboardingView from "@/extensionConsole/pages/blueprints/onboardingView/OnboardingView";
import EmptyView from "@/extensionConsole/pages/blueprints/emptyView/EmptyView";
import GetStartedView from "@/extensionConsole/pages/blueprints/GetStartedView";
import useOnboarding from "@/extensionConsole/pages/blueprints/onboardingView/useOnboarding";
import BotGamesView from "@/extensionConsole/pages/blueprints/BotGamesView";
import { TableInstance } from "react-table";
import { InstallableViewItem } from "@/installables/blueprintsTypes";

export type BlueprintsPageContentProps = {
  tableInstance: TableInstance<InstallableViewItem>;
  width: number;
  height: number;
};
const BlueprintsPageContent: React.VoidFunctionComponent<
  BlueprintsPageContentProps
> = ({ tableInstance, width, height }) => {
  const view = useSelector(selectView);
  const activeTab = useSelector(selectActiveTab);
  const { onboardingType, onboardingFilter, isLoading } = useOnboarding();

  const {
    state: { globalFilter },
    rows,
  } = tableInstance;

  const BlueprintsView = view === "list" ? ListView : GridView;

  if (activeTab.key === "Get Started") {
    return <GetStartedView width={width} height={height} />;
  }

  if (activeTab.key === "Bot Games") {
    return <BotGamesView width={width} height={height} />;
  }

  if (rows.length > 0) {
    return (
      <BlueprintsView
        tableInstance={tableInstance}
        width={width}
        height={height}
      />
    );
  }

  if (globalFilter) {
    return (
      <EmptyView tableInstance={tableInstance} height={height} width={width} />
    );
  }

  return (
    <OnboardingView
      onboardingType={onboardingType}
      isLoading={isLoading}
      filter={onboardingFilter}
      width={width}
      height={height}
    />
  );
};

export default BlueprintsPageContent;
