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

import { type RequiredMeMilestoneResponse } from "@/data/service/responseTypeHelpers";

import { type ValueOf } from "type-fest";

export const Milestones = {
  FIRST_TIME_PUBLIC_MOD_ACTIVATION: "first_time_public_blueprint_install",
  AA_COMMUNITY_EDITION_REGISTER: "aa_community_edition_register",
} as const;

/**
 * @see Milestones
 */
export type Milestone = ValueOf<typeof Milestones>;

export type UserMilestone = {
  /**
   * A lower-snake-case, human-readable identifier for the Milestone.
   * @see Milestones
   */
  milestoneName: Milestone;
  /**
   * Optional additional information to provide context about the Milestone
   */
  metadata: UnknownObject;
};

export function transformUserMilestoneResponse(
  response: RequiredMeMilestoneResponse,
): UserMilestone {
  return {
    milestoneName: response.key as Milestone,
    metadata: response.metadata ?? {},
  };
}
