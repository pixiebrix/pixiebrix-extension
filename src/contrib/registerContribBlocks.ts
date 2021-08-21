/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { registerBlock } from "@/blocks/registry";
import { AddUpdateCompany, AddUpdateContact } from "./hubspot";
import {
  AddOrganization,
  AddPerson,
  DEAL_READER,
  ORGANIZATION_READER,
  PERSON_READER,
  ResolvePerson,
} from "./pipedrive";
import {
  GeocodeTransformer,
  GoogleBigQueryQuery,
  GoogleSheetsAppend,
} from "./google";
import { SendAdvancedSlackMessage, SendSimpleSlackMessage } from "./slack";
import { AddLead } from "./salesforce";
import { RunLocalProcess, RunProcess, UiPathAppRenderer } from "./uipath";
import { PushZap } from "./zapier";
import { RunBot } from "./automationanywhere";

function registerContribBlocks(): void {
  // Google
  registerBlock(new GoogleBigQueryQuery());
  registerBlock(new GoogleSheetsAppend());
  registerBlock(new GeocodeTransformer());

  // HubSpot
  registerBlock(new AddUpdateContact());
  registerBlock(new AddUpdateCompany());
  registerBlock(new AddOrganization());

  // Pipedrive
  registerBlock(new AddPerson());
  registerBlock(new ResolvePerson());
  registerBlock(ORGANIZATION_READER);
  registerBlock(PERSON_READER);
  registerBlock(DEAL_READER);

  // Slack
  registerBlock(new SendSimpleSlackMessage());
  registerBlock(new SendAdvancedSlackMessage());

  // Salesforce
  registerBlock(new AddLead());

  // UiPath
  registerBlock(new RunProcess());
  registerBlock(new UiPathAppRenderer());
  registerBlock(new RunLocalProcess());

  // Zapier
  registerBlock(new PushZap());

  // Automation Anywhere
  registerBlock(new RunBot());
}

export default registerContribBlocks;
