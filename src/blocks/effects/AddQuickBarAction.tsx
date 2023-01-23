/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { Effect } from "@/types";
import {
  type BlockArg,
  type BlockOptions,
  type IconConfig,
  type Schema,
} from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { propertiesToSchema } from "@/validators/generic";
import quickBarRegistry, {
  type CustomAction,
} from "@/components/quickBar/quickBarRegistry";
import Icon from "@/icons/Icon";
import React from "react";
import { type PipelineExpression } from "@/runtime/mapArgs";

type ActionConfig = {
  title: string;
  subtitle?: string;
  section?: string;
  icon: IconConfig;
  action: PipelineExpression;
};

/**
 * An effect that adds an action to the PixieBrix Quick Bar.
 */
class AddQuickBarAction extends Effect {
  static BLOCK_ID = validateRegistryId("@pixiebrix/quickbar/add-action");

  constructor() {
    super(
      AddQuickBarAction.BLOCK_ID,
      "Add Quick Bar Action",
      "Add an Action to the PixieBrix Quick Bar"
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

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description: "The title for the Quick Bar Action",
      },
      subtitle: {
        type: "string",
        description: "An optional subtitle for the action",
      },
      section: {
        type: "string",
        description: "The Quick Bar section to add the action to",
      },
      icon: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
      action: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The action to perform when the Quick Bar Action is run",
      },
    },
    ["title", "action"]
  );

  async effect(
    {
      title,
      subtitle,
      section,
      icon: iconConfig,
      action: actionPipeline,
    }: BlockArg<ActionConfig>,
    { root, logger, runPipeline }: BlockOptions
  ): Promise<void> {
    // Keep track of run for tracing
    let counter = 0;

    // Expected parent id from QuickBarProviderExtensionPoint
    const parentId = `provider-${logger.context.extensionId}`;

    const action: CustomAction = {
      // XXX: old actions will still appear in the quick bar unless the extension point clears out the old actions
      id: `${logger.context.extensionId}-${title}`,
      // Can only provide a parent if the parent exists
      parent: quickBarRegistry.knownGeneratorRootIds.has(parentId)
        ? parentId
        : undefined,
      name: title,
      subtitle,
      section,
      icon: iconConfig ? (
        <Icon icon={iconConfig.id} library={iconConfig.library} />
      ) : (
        <Icon />
      ), // Defaults to a box
      extensionPointId: logger.context.extensionPointId,
      async perform() {
        const pipelinePromise = runPipeline(actionPipeline.__value__ ?? [], {
          key: "action",
          counter,
        });

        counter += 1;

        return pipelinePromise;
      },
    };

    quickBarRegistry.addAction(action);
  }
}

export default AddQuickBarAction;
