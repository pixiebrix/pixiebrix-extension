/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { selectView } from "@/options/pages/blueprints/blueprintsSelectors";
import { BlueprintListViewProps } from "@/options/pages/blueprints/blueprintsTypes";
import OnboardingView from "@/options/pages/blueprints/onboardingView/OnboardingView";
import useOnboarding from "@/options/pages/blueprints/onboardingView/useOnboarding";
import EmptyView from "@/options/pages/blueprints/emptyView/EmptyView";

const BlueprintsView: React.VoidFunctionComponent<BlueprintListViewProps> = ({
  tableInstance,
  width,
  height,
}) => {
  const view = useSelector(selectView);
  const { onboardingType, onboardingFilter, isLoading } = useOnboarding();

  const {
    state: { globalFilter },
    rows,
  } = tableInstance;

  const BlueprintsList = view === "list" ? ListView : GridView;

  if (rows.length > 0) {
    return (
      <BlueprintsList
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

export default BlueprintsView;
