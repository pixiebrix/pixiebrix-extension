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

import brickRegistry from "@/bricks/registry";
import { AddUpdateCompany, AddUpdateContact } from "./hubspot/upsert";
import { AddOrganization, AddPerson } from "./pipedrive/create";
import { ResolvePerson } from "./pipedrive/resolvers";
import {
  DEAL_READER,
  ORGANIZATION_READER,
  PERSON_READER,
} from "./pipedrive/readers";
import { GeocodeTransformer } from "./google/geocode";
import { GoogleSheetsAppend } from "./google/sheets/bricks/append";
import {
  SendAdvancedSlackMessage,
  SendSimpleSlackMessage,
} from "./slack/message";
import { AddLead } from "./salesforce/lead";
import { RunProcess } from "./uipath/process";
import { PushZap } from "./zapier/push";
import { RunBot } from "./automationanywhere/RunBot";
import { GoogleSheetsLookup } from "./google/sheets/bricks/lookup";
import SetCopilotDataEffect from "./automationanywhere/SetCopilotDataEffect";
import { RunApiTask } from "./automationanywhere/RunApiTask";

let registered = false;

function registerContribBricks(): void {
  if (registered) {
    console.warn(
      "registerContribBricks already called; multiple calls are unnecessary and may impact startup performance",
    );
  }

  brickRegistry.register([
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

    // Zapier
    new PushZap(),

    // Automation Anywhere
    new RunBot(),
    new SetCopilotDataEffect(),
    new RunApiTask(),
  ]);

  registered = true;
}

export default registerContribBricks;
