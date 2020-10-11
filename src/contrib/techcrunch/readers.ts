import { Reader } from "@/types";
import startCase from "lodash/startCase";
import { registerBlock } from "@/blocks/registry";
import trim from "lodash/trim";
import { Schema } from "@/core";

type EntityType = "person" | "organization";

function cleanText(text: string): string {
  const result = trim(text);
  if (result.endsWith("'s") || result.endsWith("’s")) {
    return result.slice(0, -2);
  } else if (result.endsWith("'") || result.endsWith("’")) {
    return result.slice(0, -1);
  } else {
    return result;
  }
}

class MentionReader extends Reader {
  entityType: EntityType;

  constructor(entityType: EntityType) {
    super(
      `techcrunch/${entityType}-mention`,
      `TechCrunch ${startCase(entityType)} Mention Reader`
    );
    this.entityType = entityType;
  }

  outputSchema: Schema = {
    type: "object",
    properties: {
      name: {
        type: "string",
      },
      crunchbaseUrl: {
        type: "string",
        format: "uri",
      },
      entity: {
        type: "string",
      },
      articleUrl: {
        type: "string",
        format: "uri",
      },
    },
    required: ["name", "crunchbaseUrl", "entity", "articleUrl"],
  };

  async isAvailable($elt: JQuery): Promise<boolean> {
    return $elt.data("type") === this.entityType;
  }

  async read($elt: JQuery) {
    return {
      articleUrl: window.location.href,
      crunchbaseUrl: $elt.attr("href"),
      name: cleanText($elt.text()),
      entity: $elt.data("entity"),
    };
  }
}

export const PERSON_MENTION_READER = new MentionReader("person");
export const ORGANIZATION_MENTION_READER = new MentionReader("organization");

registerBlock(ORGANIZATION_MENTION_READER);
registerBlock(PERSON_MENTION_READER);
