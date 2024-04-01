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

import { EffectABC } from "@/types/bricks/effectTypes";
import { BusinessError } from "@/errors/businessErrors";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";

export class AddOrganization extends EffectABC {
  // https://developers.pipedrive.com/docs/api/v1/#!/Organizations/post_organizations

  constructor() {
    super(
      "pipedrive/organizations-add",
      "Add Organization in Pipedrive",
      "Add an organization in Pipedrive CRM if it does not already exist",
    );
  }

  inputSchema = propertiesToSchema(
    {
      pipedrive: {
        $ref: "https://app.pixiebrix.com/schemas/services/pipedrive/api",
      },
      name: {
        type: "string",
        description: "Organization name",
      },
      owner_id: {
        type: "integer",
        description:
          "ID of the user who will be marked as the owner of this person. When omitted, the authorized user ID will be used.",
      },
    },
    ["name"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["http"];
  }

  async effect(
    {
      pipedrive,
      name,
      owner_id,
    }: BrickArgs<{
      name: string;
      owner_id: number;
      pipedrive: SanitizedIntegrationConfig;
    }>,
    { logger, platform }: BrickOptions,
  ): Promise<void> {
    const { data } = await platform.request<{
      items: unknown[];
    }>(pipedrive, {
      url: "https://api.pipedrive.com/v1/organizations/search",
      method: "get",
      params: {
        exact_match: true,
        term: name,
      },
    });

    if (data.items.length > 0) {
      logger.info(`Organization already exists for ${name}`);
      return;
    }

    try {
      await platform.request(pipedrive, {
        url: "https://api.pipedrive.com/v1/organizations",
        method: "post",
        data: { name, owner_id },
      });
    } catch {
      throw new BusinessError(`Error adding ${name} to Pipedrive`);
    }
  }
}

export class AddPerson extends EffectABC {
  // https://developers.pipedrive.com/docs/api/v1/#!/Persons/post_persons

  constructor() {
    super(
      "pipedrive/persons-add",
      "Add Person in Pipedrive",
      "Add a person in Pipedrive CRM if they do not already exist",
    );
  }

  inputSchema = propertiesToSchema(
    {
      pipedrive: {
        $ref: "https://app.pixiebrix.com/schemas/services/pipedrive/api",
      },
      name: {
        type: "string",
        description: "Person name",
      },
      owner_id: {
        type: "integer",
        description:
          "ID of the user who will be marked as the owner of this person. When omitted, the authorized user ID will be used.",
      },
      email: {
        type: "string",
        description: "Email address associated with the person.",
      },
      phone: {
        type: "string",
        description: "Phone number associated with the person",
      },
    },
    ["name"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["http"];
  }

  async effect(
    {
      pipedrive,
      name,
      owner_id,
      email,
      phone,
    }: BrickArgs<{
      pipedrive: SanitizedIntegrationConfig;
      name: string;
      owner_id: number;
      email?: string;
      phone?: string;
    }>,
    { logger, platform }: BrickOptions,
  ): Promise<void> {
    const { data } = await platform.request<{
      items: unknown[];
    }>(pipedrive, {
      url: "https://api.pipedrive.com/v1/persons/search",
      method: "get",
      params: {
        exact_match: true,
        term: name,
      },
    });

    if (data.items.length > 0) {
      logger.info(`Person record already exists for ${name}`);
      return;
    }

    try {
      await platform.request(pipedrive, {
        url: "https://api.pipedrive.com/v1/persons",
        method: "post",
        data: {
          name,
          owner_id,
          email: email ? [email] : undefined,
          phone: phone ? [phone] : undefined,
        },
      });
    } catch {
      throw new BusinessError(`Error adding ${name} to Pipedrive`);
    }
  }
}
