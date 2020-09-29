import { useMemo } from "react";
import extensionPointRegistry from "@/extensionPoints/registry";
import { useSelector } from "react-redux";
import { RootState } from "@/designer/options/store";
import { IExtensionPoint } from "@/core";
import { ExtensionOptions } from "@/designer/options/slices";

interface ExtensionResult {
  extensionPoint: IExtensionPoint | null;
  extensionConfig: ExtensionOptions;
}

export function useExtension(
  extensionPointId: string,
  extensionId: string
): ExtensionResult {
  console.debug("useExtension", { extensionPointId, extensionId });

  const options = useSelector((state: RootState) => state.options);

  const extensionConfig = useMemo(() => {
    let config;
    if (!extensionId) {
      return null;
    } else if (extensionPointId) {
      config = options.extensions[extensionPointId][extensionId];
    } else {
      for (const pointExtensions of Object.values(options.extensions)) {
        const pointConfig = pointExtensions[extensionId];
        if (pointConfig) {
          config = pointConfig;
          break;
        }
      }
    }
    if (!config) {
      throw new Error(
        `Could not locate configuration for extension ${extensionId}`
      );
    }
    return config;
  }, [options, extensionId, extensionPointId]);

  const extensionPoint = useMemo(() => {
    if (extensionConfig) {
      return extensionPointRegistry.lookup(extensionConfig.extensionPointId);
    } else if (extensionPointId) {
      return extensionPointRegistry.lookup(extensionPointId);
    }
    return null;
  }, [extensionPointRegistry, extensionPointId]);

  return { extensionPoint, extensionConfig };
}
