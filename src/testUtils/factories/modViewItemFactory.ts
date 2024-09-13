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

import { define } from "cooky-cutter";
import { type ModActionsEnabled, type ModViewItem } from "@/types/modTypes";
import { normalizeSemVerString } from "@/types/helpers";
import { nowTimestamp } from "@/utils/timeUtils";
import {
  autoUUIDSequence,
  registryIdFactory,
} from "@/testUtils/factories/stringFactories";

export const modViewItemFactory = define<ModViewItem>({
  activatedModVersion: normalizeSemVerString("1.0.0"),
  description(n: number): string {
    return `Mod view item ${n} created for testing`;
  },
  isUnavailable: false,
  isDeployment: false,
  sharingSource: {
    type: "Personal",
    label: "Personal",
    organization: undefined,
  },
  status: "Active",
  updatedAt: nowTimestamp(),
  modId: registryIdFactory,
  editablePackageId: autoUUIDSequence(),
  name(n: number): string {
    return `Mod View Item ${n}`;
  },
  marketplaceListingUrl: "http://example.com",
  hasUpdate: false,
  modActions(): ModActionsEnabled {
    return {
      showPublishToMarketplace: true,
      showViewDetails: true,
      showShareWithTeams: true,
      showViewLogs: true,
      showEditInWorkshop: true,
      showReactivate: true,
      showDeactivate: true,
      showDelete: true,
      showActivate: false,
    };
  },
});
