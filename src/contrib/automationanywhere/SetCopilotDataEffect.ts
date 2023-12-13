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

import { propertiesToSchema } from "@/validators/generic";
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import { type UnknownObject } from "@/types/objectTypes";
import { setPartnerCopilotData } from "@/background/messenger/api";

// Must track host data on content script instead of the frame parent because the frame parent might not be attached
// to the page at the time this data is set.
const hostData = new Map<string, UnknownObject>();

/**
 * Brick to map data from the host application to Automation Anywhere Co-Pilot forms.
 * https://docs.automationanywhere.com/bundle/enterprise-v2019/page/co-pilot-map-host-data.html
 * @since 1.8.5
 * @see initCopilotMessenger
 */
export class SetCopilotDataEffect extends EffectABC {
  static BRICK_ID = validateRegistryId(
    "@pixiebrix/automation-anywhere/set-copilot-data",
  );

  constructor() {
    super(
      SetCopilotDataEffect.BRICK_ID,
      "Map Automation Anywhere Co-Pilot Data",
      "Map host data to Automation Co-Pilot forms",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      processId: {
        title: "Process Id",
        type: ["string", "number"],
        description: "The Co-Pilot process ID",
      },
      data: {
        title: "Form Data",
        type: "object",
        additionalProperties: true,
        description:
          "The form data. See documentation [Map host data to Automation Co-Pilot forms](https://docs.automationanywhere.com/bundle/enterprise-v2019/page/co-pilot-map-host-data.html)",
      },
    },
    ["processId", "data"],
  );

  async effect({
    processId,
    data,
  }: BrickArgs<{
    processId: string | number;
    data: UnknownObject;
  }>): Promise<void> {
    hostData.set(String(processId), data);

    setPartnerCopilotData({
      data: Object.fromEntries(hostData.entries()),
    });
  }
}

export default SetCopilotDataEffect;
