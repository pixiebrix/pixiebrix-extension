import { BlockPipeline } from "@/blocks/types";
import { reducePipeline } from "@/runtime/reducePipeline";
import { BlockArgContext, ServiceContext, UserOptions, UUID } from "@/core";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { expectContext } from "@/utils/expectContext";
import { HeadlessModeError } from "@/blocks/errors";
import { BusinessError } from "@/errors";
import { RendererPayload } from "@/runtime/runtimeTypes";
import { Args, mapArgs, MapOptions } from "@/runtime/mapArgs";
import { Except } from "type-fest";
import { UnknownObject } from "@/types";
import { ApiVersionOptions } from "@/runtime/apiVersionOptions";

type RunPipelineParams = {
  nonce: UUID;
  pipeline: BlockPipeline;
  context: BlockArgContext;
  options: ApiVersionOptions;
};

/**
 * Run a BlockPipeline in the contentScript, passing back the information required to run the renderer
 * @param pipeline the block pipeline
 * @param context the context, including @input, @options, and services
 * @param nonce a nonce to help the caller correlate requests/responses. (This shouldn't be necessary in practice though
 *  because the messaging framework takes care of the correlation. In this case we're just using it as a key on
 *  RendererPayload
 * @param options pipeline options to pass to reducePipeline
 */
export async function runRendererPipeline({
  pipeline,
  context,
  nonce,
  options,
}: RunPipelineParams): Promise<RendererPayload> {
  expectContext("contentScript");

  try {
    await reducePipeline(
      pipeline,
      {
        input: context["@input"] ?? {},
        optionsArgs: (context["@options"] ?? {}) as UserOptions,
        // Pass null here to force the runtime to handle correctly. Passing `document` here wouldn't make sense because
        // it would be the page that contains the react tree (i.e., the frame of the sidebar)
        root: null,
        // `reducePipeline` just spreads the serviceContext. If we needed to pick out the actual services we could do the
        // following. However, we actually want to pass through the rest of the context and we don't have an affordance
        // for that in the InitialValues type
        // pickBy(context, (value: unknown) => isPlainObject(value) && ("__service" in (value as UnknownObject))) as ServiceContext
        serviceContext: context as ServiceContext,
      },
      {
        logger: new ConsoleLogger(),
        headless: true,
        ...options,
      }
    );
  } catch (error) {
    if (error instanceof HeadlessModeError) {
      return {
        key: nonce,
        blockId: error.blockId,
        args: error.args,
        ctxt: error.ctxt,
      };
    }

    throw error;
  }

  throw new BusinessError("Pipeline does not include a renderer");
}

export async function runEffectPipeline({
  pipeline,
  context,
  options,
}: RunPipelineParams): Promise<void> {
  expectContext("contentScript");

  await reducePipeline(
    pipeline,
    {
      input: context["@input"] ?? {},
      optionsArgs: (context["@options"] ?? {}) as UserOptions,
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
      logger: new ConsoleLogger(),
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
}: {
  config: Args;
  context: UnknownObject;
  options: Except<MapOptions, "implicitRender">;
}): Promise<unknown> {
  expectContext("contentScript");

  return mapArgs(config, context, { ...options, implicitRender: null });
}
