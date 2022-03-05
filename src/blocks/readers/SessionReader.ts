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
import { ReaderOutput, Schema } from "@/core";
import * as session from "@/contentScript/context";
import { getExtensionAuth } from "@/auth/token";

class SessionReader extends Reader {
  defaultOutputKey = "session";

  constructor() {
    super(
      "@pixiebrix/session",
      "PixieBrix session reader",
      "Read information about the current tab session"
    );
  }

  async read(): Promise<ReaderOutput> {
    return {
      sessionId: session.sessionId,
      navigationId: session.navigationId,
      sessionTimestamp: session.sessionTimestamp.toISOString(),
      navigationTimestamp: session.navigationTimestamp.toISOString(),
      ...(await getExtensionAuth()),
    };
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  override async isPure(): Promise<boolean> {
    return true;
  }

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "A unique website session id",
        format: "uuid",
      },
      sessionTimestamp: {
        type: "string",
        description: "Timestamp when the session started",
        format: "date-time",
      },
      navigationId: {
        type: "string",
        description: "A unique navigation id",
        format: "uuid",
      },
      navigationTimestamp: {
        type: "string",
        description: "Timestamp when the last navigation occurred",
        format: "date-time",
      },
      user: {
        type: "string",
        description: "The username for the account",
      },
      email: {
        type: "string",
        format: "email",
        description: "The email address for the account",
      },
    },
  };

  async isAvailable() {
    return true;
  }
}

export default SessionReader;
