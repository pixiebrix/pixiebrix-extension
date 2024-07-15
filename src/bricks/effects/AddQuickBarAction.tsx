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

import { validateRegistryId } from "@/types/helpers";
import Icon from "@/icons/Icon";
import React from "react";
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { type IconConfig } from "@/types/iconTypes";
import { type Schema } from "@/types/schemaTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import type { BrickConfig } from "@/bricks/types";
import type { PlatformCapability } from "@/platform/capabilities";
import { uniq } from "lodash";
import type { CustomAction } from "@/platform/platformTypes/quickBarProtocol";
import { propertiesToSchema } from "@/utils/schemaUtils";

type ActionConfig = {
  /**
   * The title for the Quick Bar Action
   */
  title: string;
  /**
   * An optional subtitle/description for the action
   */
  subtitle?: string;
  /**
   * An optional section for grouping actions
   */
  section?: string;
  /**
   * An optional icon for the action. If not provided, a box will be used.
   */
  icon?: IconConfig;
  /**
   * Action to run when the Quick Bar Action is run
   */
  action: PipelineExpression;
  /**
   * Priority of the action: https://kbar.vercel.app/docs/concepts/priority
   */
  priority?: number;
};

// Default priority used by KBar: https://kbar.vercel.app/docs/concepts/priority
const DEFAULT_PRIORITY = 1;

/**
 * An effect that adds an action to the PixieBrix Quick Bar.
 * @see QuickBarProviderExtensionPoint
 */
class AddQuickBarAction extends EffectABC {
  static BLOCK_ID = validateRegistryId("@pixiebrix/quickbar/add");

  constructor() {
    super(
      AddQuickBarAction.BLOCK_ID,
      "Add Quick Bar Action",
      "Add an action to the PixieBrix Quick Bar",
    );
  }

  override async isPure(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if pure
    return false;
  }

  override async isRootAware(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if any sub-calls are root aware
    return true;
  }

  override async getRequiredCapabilities(
    _config: BrickConfig,
  ): Promise<PlatformCapability[]> {
    return uniq([
      ...(await super.getRequiredCapabilities(_config)),
      "quickBar",
    ]);
  }

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description: "The title for the Quick Bar Action",
      },
      subtitle: {
        type: "string",
        description: "An optional subtitle/description for the action",
      },
      section: {
        type: "string",
        description: "An optional section for grouping actions",
      },
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
      action: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The action to perform when the Quick Bar Action is run",
      },
      priority: {
        // By default, in KBar, each action has a base priority value of 1. So we're just keeping the default
        // https://kbar.vercel.app/docs/concepts/priority
        description:
          "The priority of the action. Higher priority actions appear first. (HIGH = 1, MEDIUM = 0, LOW = -1)",
        type: "number",
        default: DEFAULT_PRIORITY,
      },
    },
    ["title", "action"],
  );

  async effect(
    {
      title,
      subtitle,
      section,
      icon: iconConfig,
      action: actionPipeline,
      // Be explicit about the default priority if non is provided
      priority = DEFAULT_PRIORITY,
    }: BrickArgs<ActionConfig>,
    {
      root,
      runPipeline,
      abortSignal,
      platform,
      meta: { modComponentRef },
    }: BrickOptions,
  ): Promise<void> {
    const { quickBar } = platform;
    const { modComponentId } = modComponentRef;

    // The runtime checks the abortSignal for each brick. But check here too to avoid flickering in the Quick Bar
    if (abortSignal?.aborted) {
      return;
    }

    // Counter to keep track of the action run number for tracing
    let counter = 0;

    // Expected parent id from QuickBarProviderExtensionPoint
    const parentId = `provider-${modComponentId}`;

    const action: CustomAction = {
      // XXX: old actions will still appear in the quick bar unless the starter brick clears out the old actions
      id: `${modComponentId}-${title}`,
      // Additional metadata, for enabling clearing out old actions
      modComponentRef,
      // Can only provide a parent if the parent exists
      parent: quickBar.knownGeneratorRootIds.has(parentId)
        ? parentId
        : undefined,
      name: title,
      subtitle,
      section,
      priority,
      // Defaults to a box; match behavior from Quick Bar Action extension point
      icon: iconConfig ? (
        <Icon icon={iconConfig.id} library={iconConfig.library} />
      ) : (
        <Icon />
      ),
      async perform() {
        const pipelinePromise = runPipeline(
          actionPipeline,
          {
            key: "action",
            counter,
          },
          {},
          root,
        );

        counter += 1;

        return pipelinePromise;
      },
    };

    quickBar.addAction(action);
  }
}

export default AddQuickBarAction;
