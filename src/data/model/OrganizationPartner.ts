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

import { type UUID } from "@/types/stringTypes";
import type { components } from "@/types/swagger";
import { validateUUID } from "@/types/helpers";

export type OrganizationPartner = {
  readonly partnerId: UUID;
  partnerName: string;
  partnerTheme?: string;
  documentationUrl?: URL;
};

export function transformOrganizationPartnerResponse(
  response: components["schemas"]["Me"]["partner"],
): OrganizationPartner {
  const partner: OrganizationPartner = {
    partnerId: validateUUID(response.id),
    partnerName: response.name,
    partnerTheme: response.theme,
  };

  if (response.documentation_url) {
    partner.documentationUrl = new URL(response.documentation_url);
  }

  return partner;
}
