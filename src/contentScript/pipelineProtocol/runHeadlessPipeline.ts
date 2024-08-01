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

import { type RunPipelineParams } from "@/contentScript/pipelineProtocol/types";
import { getPlatform } from "@/platform/platformContext";
import { reducePipeline } from "@/runtime/reducePipeline";
import { type IntegrationsContext } from "@/types/runtimeTypes";
import { expectContext } from "@/utils/expectContext";

/**
 * Run a pipeline in headless mode.
 */
export async function runHeadlessPipeline({
  pipeline,
  context,
  options,
  meta,
  messageContext,
}: RunPipelineParams): Promise<unknown> {
  expectContext("contentScript");

  return reducePipeline(
    pipeline,
    {
      input: context["@input"] ?? {},
      optionsArgs: context["@options"] ?? {},
      // Pass undefined here to force the runtime to handle correctly. Passing `document` here wouldn't make sense because
      // it would be the page that contains the React tree (i.e., the frame of the sidebar)
      root: undefined,
      // `reducePipeline` just spreads the serviceContext. If we needed to pick out the actual services we could do the
      // following. However, we actually want to pass through the rest of the context and we don't have an affordance
      // for that in the InitialValues type
      // pickBy(context, (value: unknown) => isPlainObject(value) && ("__service" in (value as UnknownObject))) as ServiceContext
      serviceContext: context as IntegrationsContext,
    },
    {
      ...options,
      ...meta,
      logger: getPlatform().logger.childLogger(messageContext),
      headless: true,
    },
  );
}
