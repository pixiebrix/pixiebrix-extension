import { Schema } from "@/core";

export function makeArgumentYaml(schema: Schema): string {
  let result = "";
  if (schema.type !== "object") {
    return result;
  }

  for (const [prop, value] of Object.entries(schema.properties)) {
    if (typeof value === "boolean") {
      continue;
    }

    result += `# ${prop}: ${value.type} (${
      schema.required.includes(prop) ? "required" : "optional"
    })\n`;
    if (value.description) {
      for (const line of value.description.split("\n")) {
        result += `# ${line} \n`;
      }
    }

    if (value.enum) {
      result += "# valid values:\n";
      for (const line of value.enum) {
        result += `# - ${line} \n`;
      }
    }

    result += `# ${prop.includes(" ") ? `"${prop}"` : prop}: \n`;
  }

  return result;
}
