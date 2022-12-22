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

import { useSelector } from "react-redux";
import { selectMilestones } from "@/auth/authSelectors";
import { useMemo } from "react";
import { Milestone } from "@/types/contract";
import { useGetMeQuery } from "@/services/api";

export type MilestoneHelpers = {
  getMilestone: (milestoneKey: string) => Milestone;
  hasMilestone: (milestoneKey: string) => boolean;
  hasEveryMilestone: (milestoneKeys: string[]) => boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => void;
};

function useMilestones(): MilestoneHelpers {
  const cachedMilestones = useSelector(selectMilestones);
  const { data: me, isFetching, isLoading, refetch } = useGetMeQuery();
  const milestones = me ? me.milestones : cachedMilestones;

  return useMemo(() => {
    const milestonesByKey = Object.fromEntries(
      (milestones ?? []).map((milestone) => [milestone.key, milestone])
    );

    const getMilestone = (milestoneKey: string) =>
      milestonesByKey[milestoneKey];

    const hasMilestone = (milestoneKey: string) =>
      milestoneKey in milestonesByKey;

    const hasEveryMilestone = (milestoneKeys: string[]) =>
      milestoneKeys.every((milestoneKey) => hasMilestone(milestoneKey));

    return {
      getMilestone,
      hasMilestone,
      hasEveryMilestone,
      isFetching,
      isLoading,
      refetch,
    };
  }, [milestones]);
}

export default useMilestones;
