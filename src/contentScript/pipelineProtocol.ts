import { BlockPipeline } from "@/blocks/types";
import { reducePipeline } from "@/runtime/reducePipeline";
import { BlockArgContext, ServiceContext, UserOptions, UUID } from "@/core";
import ConsoleLogger from "@/tests/ConsoleLogger";
import { expectContext } from "@/utils/expectContext";
import { HeadlessModeError } from "@/blocks/errors";
import { BusinessError } from "@/errors";
import { RendererPayload } from "@/runtime/runtimeTypes";

type RunPipelineParams = {
  nonce: UUID;
  pipeline: BlockPipeline;
  context: BlockArgContext;
};

/**
 * Run a BlockPipeline in the contentScript, passing back the information required to run the renderer
 * @param pipeline the block pipeline
 * @param context the context, including @input, @options, and services
 * @param nonce a nonce to help the caller correlate requests/responses. (This shouldn't be necessary in practice though
 *  because the messaging framework takes care of the correlation. In this case we're just using it as a key on
 *  RendererPayload
 */
export async function runRendererPipeline({
  pipeline,
  context,
  nonce,
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
      }
    );
    throw new BusinessError("Pipeline does not include a renderer");
  } catch (error: unknown) {
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
}

export async function runEffectPipeline({
  pipeline,
  context,
}: RunPipelineParams): Promise<void> {
  expectContext("contentScript");

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
    }
  );
}
