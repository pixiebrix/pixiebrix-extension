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

export type MilestoneHelpers = {
  hasMilestone: (milestoneKey: string) => boolean;
  hasEveryMilestone: (milestoneKeys: string[]) => boolean;
};

function useMilestones(): MilestoneHelpers {
  const milestones = useSelector(selectMilestones);

  return useMemo(() => {
    const userMilestoneKeys = new Set((milestones ?? []).map((x) => x.key));

    const hasMilestone = (milestoneKey: string) =>
      userMilestoneKeys.has(milestoneKey);

    const hasEveryMilestone = (milestoneKeys: string[]) =>
      milestoneKeys.every((milestoneKey) => hasMilestone(milestoneKey));

    return {
      hasMilestone,
      hasEveryMilestone,
    };
  }, [milestones]);
}

export default useMilestones;
