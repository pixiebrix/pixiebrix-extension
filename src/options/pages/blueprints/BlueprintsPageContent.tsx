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
import ListView from "@/options/pages/blueprints/listView/ListView";
import GridView from "@/options/pages/blueprints/gridView/GridView";
import { useSelector } from "react-redux";
import {
  selectActiveTab,
  selectView,
} from "@/options/pages/blueprints/blueprintsSelectors";
import { type BlueprintsPageContentProps } from "@/options/pages/blueprints/blueprintsTypes";
import OnboardingView from "@/options/pages/blueprints/onboardingView/OnboardingView";
import EmptyView from "@/options/pages/blueprints/emptyView/EmptyView";
import GetStartedView from "@/options/pages/blueprints/GetStartedView";
import useOnboarding from "@/options/pages/blueprints/onboardingView/useOnboarding";
import BotGamesView from "@/options/pages/blueprints/BotGamesView";

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
