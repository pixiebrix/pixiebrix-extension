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

import { useSelector } from "react-redux";
import { selectMilestones } from "@/auth/authSelectors";
import { useMemo } from "react";
import { appApi } from "@/data/service/api";
import { type UserMilestone } from "@/data/model/UserMilestone";

type MilestoneHelpers = {
  getMilestone: (milestoneKey: string) => UserMilestone | undefined;
  hasMilestone: (milestoneKey: string) => boolean;
  hasEveryMilestone: (milestoneKeys: string[]) => boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => void;
};

function useMilestones(): MilestoneHelpers {
  const cachedMilestones = useSelector(selectMilestones);
  const [refetch, { data: me, isFetching, isLoading }] =
    appApi.useLazyGetMeQuery();
  const milestones = me ? me.userMilestones : cachedMilestones;

  return useMemo(() => {
    const milestonesByName = new Map(
      (milestones ?? []).map((milestone) => [
        milestone.milestoneName,
        milestone,
      ]),
    );

    const getMilestone = (milestoneName: string) =>
      milestonesByName.get(milestoneName);

    const hasMilestone = (milestoneName: string) =>
      milestonesByName.has(milestoneName);

    const hasEveryMilestone = (milestoneNames: string[]) =>
      milestoneNames.every((milestoneName) => hasMilestone(milestoneName));

    return {
      getMilestone,
      hasMilestone,
      hasEveryMilestone,
      isFetching,
      isLoading,
      refetch,
    };
  }, [milestones, isFetching, isLoading, refetch]);
}

export default useMilestones;
