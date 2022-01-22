import { OptionsState } from "@/store/extensionsTypes";
import { UnresolvedExtension } from "@/core";

export function selectExtensions({
  options,
}: {
  options: OptionsState;
}): UnresolvedExtension[] {
  if (!Array.isArray(options.extensions)) {
    console.warn("state migration has not been applied yet", {
      options,
    });
    throw new TypeError("state migration has not been applied yet");
  }

  return options.extensions;
}
