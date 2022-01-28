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

import { useDebounce } from "use-debounce";
import { useState } from "react";
import { MessageContext, RawConfig } from "@/core";
import { useAsyncEffect } from "use-async-effect";
import { loadBrickYaml } from "@/runtime/brickYaml";

const LOG_MESSAGE_CONTEXT_DEBOUNCE_MS = 350;

/**
 * Hook that returns the log message MessageContext corresponding to a YAML brick config.
 */
function useLogContext(config: string | null): MessageContext | undefined {
  // Track latest context, as there will be intermediate states where the YAML is invalid
  const [context, setContext] = useState<MessageContext | undefined>();
  const [debouncedConfig] = useDebounce(
    config,
    LOG_MESSAGE_CONTEXT_DEBOUNCE_MS
  );

  // Use async so we don't block the main render loop (is that actually needed?)
  useAsyncEffect(async () => {
    let json: RawConfig;
    try {
      json = loadBrickYaml(debouncedConfig) as RawConfig;
    } catch {
      // The config won't always be valid YAML when editing
      return;
    }

    const id = json.metadata?.id;

    switch (json.kind) {
      case "service": {
        setContext({ serviceId: id });
        break;
      }

      case "extensionPoint": {
        setContext({ extensionPointId: id });
        break;
      }

      case "component":
      case "reader": {
        setContext({ blockId: id });
        break;
      }

      case "recipe": {
        setContext({ blueprintId: id });
        break;
      }

      default: {
        return null;
      }
    }
  }, [debouncedConfig, setContext]);

  return context;
}

export default useLogContext;
