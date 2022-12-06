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
import { type Milestone } from "@/types/contract";
import { useCallback } from "react";

const useMilestones = (): {
  hasMilestone: (milestoneKey: string) => boolean;
  hasEveryMilestone: (milestoneKeys: string[]) => boolean;
} => {
  const milestones = useSelector(selectMilestones);

  const hasMilestone = (milestoneKey: string) =>
    milestones.some((milestone: Milestone) => milestone.key === milestoneKey);
  const hasEveryMilestone = useCallback(
    (milestoneKeys: string[]) =>
      milestoneKeys.every((milestoneKey) => hasMilestone(milestoneKey)),
    [milestones]
  );
  return {
    hasMilestone,
    hasEveryMilestone,
  };
};

export default useMilestones;
