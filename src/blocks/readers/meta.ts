import { Reader } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { getExtensionAuth } from "@/auth/token";

// @ts-ignore: babel/plugin-transform-typescript doesn't support the import = syntax
import chromeNamespace from "chrome";
import { ReaderOutput, Schema } from "@/core";
type UserInfo = chromeNamespace.identity.UserInfo;

class ChromeProfileReader extends Reader {
  constructor() {
    super(
      "pixiebrix/chrome-profile-reader",
      "Chrome user profile reader",
      "Read data from the Chrome user profile"
    );
  }

  async read(): Promise<UserInfo> {
    // https://developer.chrome.com/apps/identity#method-getProfileUserInfo
    return await new Promise((resolve) => {
      // @ts-ignore: the type definition is out-of-date
      chrome.identity.getProfileUserInfo("ANY", (userInfo) =>
        resolve(userInfo)
      );
    });
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
    return !!chrome?.identity;
  }
}

class PixieBrixProfileReader extends Reader {
  constructor() {
    super(
      "pixiebrix/pixiebrix-profile-reader",
      "PixieBrix user profile reader",
      "Read email and other profile information from PixieBrix app"
    );
  }

  async read() {
    return (await getExtensionAuth()) as ReaderOutput;
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

class DocumentReader extends Reader {
  constructor() {
    super(
      "pixiebrix/context-reader",
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

class ManifestReader extends Reader {
  constructor() {
    super(
      "pixiebrix/manifest-reader",
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

registerBlock(new DocumentReader());
registerBlock(new ManifestReader());
registerBlock(new ChromeProfileReader());
registerBlock(new PixieBrixProfileReader());
