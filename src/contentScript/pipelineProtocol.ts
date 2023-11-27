import { type BrickPipeline } from "@/bricks/types";
import { reducePipeline } from "@/runtime/reducePipeline";
import { expectContext } from "@/utils/expectContext";
import { HeadlessModeError } from "@/bricks/errors";
import { type Args, mapArgs, type MapOptions } from "@/runtime/mapArgs";
import { type Except } from "type-fest";
import { type UnknownObject } from "@/types/objectTypes";
import { type ApiVersionOptions } from "@/runtime/apiVersionOptions";
import { BusinessError } from "@/errors/businessErrors";
import BackgroundLogger from "@/telemetry/BackgroundLogger";
import { type UUID } from "@/types/stringTypes";
import {
  type BrickArgsContext,
  type RunMetadata,
  type ServiceContext,
} from "@/types/runtimeTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { type RendererRunPayload } from "@/types/rendererTypes";
import extendModVariableContext from "@/runtime/extendModVariableContext";
import { type RegistryId } from "@/types/registryTypes";

type RunPipelineParams = {
  nonce: UUID;
  pipeline: BrickPipeline;
  context: BrickArgsContext;
  options: ApiVersionOptions;
  meta: RunMetadata;
  messageContext: MessageContext;
};

/**
 * Run a BrickPipeline in the contentScript, passing back the information required to run the renderer
 * @param pipeline the block pipeline
 * @param context the context, including @input, @options, and services
 * @param nonce a nonce to help the caller correlate requests/responses. (This shouldn't be necessary in practice though
 *  because the messaging framework takes care of the correlation. In this case we're just using it as a key on
 *  RendererPayload)
 * @param options pipeline options to pass to reducePipeline
 * @param meta run/trace metadata
 * @param messageContext the message context for the logger
 */
export async function runRendererPipeline({
  pipeline,
  context,
  nonce,
  options,
  meta,
  messageContext,
}: RunPipelineParams): Promise<RendererRunPayload> {
  expectContext("contentScript");

  try {
    await reducePipeline(
      pipeline,
      {
        input: context["@input"] ?? {},
        optionsArgs: context["@options"] ?? {},
        // Pass null here to force the runtime to handle correctly. Passing `document` here wouldn't make sense because
        // it would be the page that contains the React tree (i.e., the frame of the sidebar)
        root: null,
        // `reducePipeline` just spreads the serviceContext. If we needed to pick out the actual services we could do the
        // following. However, we actually want to pass through the rest of the context and we don't have an affordance
        // for that in the InitialValues type
        // pickBy(context, (value: unknown) => isPlainObject(value) && ("__service" in (value as UnknownObject))) as ServiceContext
        serviceContext: context as ServiceContext,
      },
      {
        logger: new BackgroundLogger(messageContext),
        headless: true,
        ...options,
        ...meta,
      }
    );
  } catch (error) {
    if (error instanceof HeadlessModeError) {
      return {
        key: nonce,
        blockId: error.blockId,
        args: error.args,
        ctxt: error.ctxt,
        ...meta,
      };
    }

    throw error;
  }

  throw new BusinessError("Pipeline does not include a renderer");
}

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

  if (meta.extensionId == null) {
    throw new Error("runHeadlessPipeline requires meta.extensionId");
  }

  return reducePipeline(
    pipeline,
    {
      input: context["@input"] ?? {},
      optionsArgs: context["@options"] ?? {},
      // Pass null here to force the runtime to handle correctly. Passing `document` here wouldn't make sense because
      // it would be the page that contains the React tree (i.e., the frame of the sidebar)
      root: null,
      // `reducePipeline` just spreads the serviceContext. If we needed to pick out the actual services we could do the
      // following. However, we actually want to pass through the rest of the context and we don't have an affordance
      // for that in the InitialValues type
      // pickBy(context, (value: unknown) => isPlainObject(value) && ("__service" in (value as UnknownObject))) as ServiceContext
      serviceContext: context as ServiceContext,
    },
    {
      ...options,
      ...meta,
      logger: new BackgroundLogger(messageContext),
      headless: true,
    }
  );
}

/**
 * Run `mapArgs` in the contentScript.
 *
 *`mapArgs` should not be run in an extension context because the extension context is privileged. (You'll also get
 * a CSP error about 'unsafe-eval' if using nunjucks or an engine that uses eval under the hood
 *
 * Requires `apiVersion: 3` or later because MapOptions.implicitRender is not supported (because you can't pass
 * functions across message boundaries).
 *
 * Future work:
 * - In Chrome, execute this in the sandbox: https://github.com/pixiebrix/pixiebrix-extension/issues/105
 *
 * @see mapArgs
 */
export async function runMapArgs({
  config,
  context,
  options,
  blueprintId,
}: {
  config: Args;
  context: UnknownObject;
  options: Except<MapOptions, "implicitRender"> & {
    /**
     * True to extend the context with the mod variable.
     * @since 1.7.34
     */
    extendModVariable: boolean;
  };
  blueprintId: RegistryId | null;
}): Promise<unknown> {
  expectContext("contentScript");

  const extendedContext = extendModVariableContext(context, {
    blueprintId,
    options,
    // The mod variable is only update when running a brick in a pipeline. It's not updated for `defer` expressions,
    // e.g., when rendering items for a ListElement in the Document Builder.
    update: false,
  });

  return mapArgs(config, extendedContext, { ...options, implicitRender: null });
}
