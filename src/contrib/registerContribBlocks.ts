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

import blockRegistry from "@/blocks/registry";
import { AddUpdateCompany, AddUpdateContact } from "./hubspot/upsert";
import { AddOrganization, AddPerson } from "./pipedrive/create";
import { ResolvePerson } from "./pipedrive/resolvers";
import {
  DEAL_READER,
  ORGANIZATION_READER,
  PERSON_READER,
} from "./pipedrive/readers";
import { GeocodeTransformer } from "./google/geocode";
import { GoogleSheetsAppend } from "./google/sheets/append";
import {
  SendAdvancedSlackMessage,
  SendSimpleSlackMessage,
} from "./slack/message";
import { AddLead } from "./salesforce/lead";
import { RunProcess } from "./uipath/process";
import { RunLocalProcess } from "./uipath/localProcess";
import { UiPathAppRenderer } from "./uipath/embedApp";
import { PushZap } from "./zapier/push";
import { RunBot } from "./automationanywhere/RunBot";
import { GoogleSheetsLookup } from "@/contrib/google/sheets/lookup";

function registerContribBlocks(): void {
  blockRegistry.register([
    // Google
    new GoogleSheetsAppend(),
    new GoogleSheetsLookup(),
    new GeocodeTransformer(),

    // HubSpot
    new AddUpdateContact(),
    new AddUpdateCompany(),
    new AddOrganization(),

    // Pipedrive
    new AddPerson(),
    new ResolvePerson(),
    ORGANIZATION_READER,
    PERSON_READER,
    DEAL_READER,

    // Slack
    new SendSimpleSlackMessage(),
    new SendAdvancedSlackMessage(),

    // Salesforce
    new AddLead(),

    // UiPath
    new RunProcess(),
    new UiPathAppRenderer(),
    new RunLocalProcess(),

    // Zapier
    new PushZap(),

    // Automation Anywhere
    new RunBot(),
  ]);
}

export default registerContribBlocks;
