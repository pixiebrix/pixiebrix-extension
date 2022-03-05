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

import { Reader } from "@/types";
import { getUserData } from "@/background/messenger/api";
import { Schema } from "@/core";

class ProfileReader extends Reader {
  defaultOutputKey = "profile";

  constructor() {
    super(
      "@pixiebrix/profile",
      "PixieBrix user profile reader",
      "Read email, groups, and other profile information from PixieBrix app"
    );
  }

  async read() {
    return getUserData();
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      user: {
        type: "string",
        format: "uuid",
        description: "The user id for the account",
      },
      email: {
        type: "string",
        format: "email",
        description: "The email address for the account",
      },
      groups: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
          },
        },
      },
      organizations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
          },
        },
      },
    },
  };

  async isAvailable() {
    return true;
  }
}

export default ProfileReader;
