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

/**
 * @file Test utilities for injecting registries into the runtime.
 * @since 1.8.2 inject the brick registry into the runtime
 * @since 1.8.10 set the ambient platform dynamically
 */

import brickRegistry from "@/bricks/registry";
import { initRuntime } from "../runtime/reducePipeline";
import { setPlatform } from "../platform/platformContext";

// Since 1.8.2, the runtime is decoupled from the brick registry.
initRuntime(brickRegistry);

// Use beforeEach so individual tests can cleanly override the ambient platform
beforeEach(async () => {
  // Use contentScriptPlatform as the default because it covers the most functionality
  // Perform dynamic import to ensure the mocks defined in the test file take precedence.
  const { default: contentScriptPlatform } = await import(
    "../contentScript/contentScriptPlatform"
  );

  // Since 1.8.10, we set an ambient platform
  setPlatform(contentScriptPlatform);
});
