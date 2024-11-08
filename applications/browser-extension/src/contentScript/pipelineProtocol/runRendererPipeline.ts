import { reducePipeline } from "../../runtime/reducePipeline";
import { expectContext } from "../../utils/expectContext";
import { HeadlessModeError } from "../../bricks/errors";
import { BusinessError } from "../../errors/businessErrors";
import { type IntegrationContext } from "../../types/runtimeTypes";
import { type RendererRunPayload } from "../../types/rendererTypes";
import { getPlatform } from "../../platform/platformContext";
import { type RunPipelineParams } from "./types";

/**
 * Run a BrickPipeline in the contentScript, passing back the information required to run the renderer
 * @param pipeline the block pipeline
 * @param context the context, including @input, @options, and services
 * @param nonce a nonce to help the caller correlate requests/responses. (This shouldn't be necessary in practice though
 * because the messaging framework takes care of the correlation. In this case we're just using it as a key on
 * RendererPayload)
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
        // Pass undefined here to force the runtime to handle correctly. Passing `document` here wouldn't make sense because
        // it would be the page that contains the React tree (i.e., the frame of the sidebar)
        root: undefined,
        // `reducePipeline` just spreads the integrationContext. If we needed to pick out the actual integration
        // configurations, we could do the following. However, we actually want to pass through the rest of the
        // context and we don't have an affordance for that in the InitialValues type
        // pickBy(context, (value: unknown) => isPlainObject(value) && ("__service" in (value as UnknownObject))) as ServiceContext
        integrationContext: context as IntegrationContext,
      },
      {
        logger: getPlatform().logger.childLogger(messageContext),
        headless: true,
        ...options,
        ...meta,
      },
    );
  } catch (error) {
    if (error instanceof HeadlessModeError) {
      return {
        key: nonce,
        brickId: error.brickId,
        args: error.args,
        ctxt: error.ctxt,
        ...meta,
      };
    }

    throw error;
  }

  throw new BusinessError("Pipeline does not include a renderer");
}
