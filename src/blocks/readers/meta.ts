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

import { Reader } from "@/types";
import { getExtensionAuth } from "@/auth/token";
import * as session from "@/contentScript/context";
import { ReaderOutput, Schema } from "@/core";
import { Manifest, Permissions } from "webextension-polyfill-ts";
import chromeP from "webext-polyfill-kinda";
import { isChrome } from "webext-detect-page";

export class ChromeProfileReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/chrome-profile",
      "Chrome user profile reader",
      "Read data from the Chrome user profile"
    );
  }

  permissions: Permissions.Permissions = {
    permissions: ["identity.email" as Manifest.OptionalPermission],
    origins: [],
  };

  async read(): Promise<ReaderOutput> {
    if (!chrome.identity) {
      throw new Error("No access to the Chrome Identity API");
    }

    const userInfo = await chromeP.identity.getProfileUserInfo();
    return { ...userInfo };
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "A unique identifier for the account",
      },
      email: {
        type: "string",
        format: "email",
        description:
          "An email address for the user account signed into the current profile.",
      },
    },
  };

  async isAvailable(): Promise<boolean> {
    return Boolean(chrome?.identity) && isChrome();
  }
}

export class TimestampReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/timestamp",
      "Generate a timestamp",
      "Get the current date-time in ISO format"
    );
  }

  async read() {
    return {
      timestamp: new Date().toISOString(),
    };
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      timestamp: {
        type: "string",
        description: "Current ISO date-time",
        format: "date-time",
      },
    },
  };

  async isAvailable() {
    return true;
  }
}

export class PixieBrixSessionReader extends Reader {
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

  outputSchema: Schema = {
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

export class PixieBrixProfileReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/profile",
      "PixieBrix user profile reader",
      "Read email and other profile information from PixieBrix app"
    );
  }

  async read() {
    return getExtensionAuth() as Promise<ReaderOutput>;
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
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
    const { email } = await getExtensionAuth();
    return email != null;
  }
}

export class DocumentReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/document-context",
      "Context reader",
      "Read generic metadata about the current page context"
    );
  }

  async read() {
    return {
      url: document.location.href,
      timestamp: new Date().toISOString(),
    };
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      url: {
        type: "string",
        format: "uri",
        description: "The current URL",
      },
      timestamp: {
        type: "string",
        format: "date-time",
        description: "The current time in ISO format",
      },
    },
    required: ["url", "timestamp"],
  };

  async isAvailable() {
    return true;
  }
}

export class ManifestReader extends Reader {
  constructor() {
    super(
      "@pixiebrix/chrome-extension-manifest",
      "Chrome manifest reader",
      "Read the Chrome extension manifest"
    );
  }

  async isAvailable() {
    return true;
  }

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      manifest_version: {
        type: "integer",
      },
      name: {
        type: "string",
      },
      short_name: {
        type: "string",
      },
      minimum_chrome_version: {
        type: "string",
      },
      version: {
        type: "string",
      },
      description: {
        type: "string",
      },
    },
  };

  async read() {
    return chrome.runtime.getManifest();
  }
}
