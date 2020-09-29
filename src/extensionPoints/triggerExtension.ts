import { ExtensionPoint } from "@/types";
import { faBolt, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  reducePipeline,
  blockList,
  BlockPipeline,
  BlockConfig,
  makeServiceContext,
} from "@/blocks/combinators";
import { IBlock, IExtension, Schema, ServiceLocator } from "@/core";

interface TriggerConfig {
  action: BlockPipeline | BlockConfig;
}

export abstract class TriggerExtensionPoint extends ExtensionPoint<
  TriggerConfig
> {
  protected constructor(
    id: string,
    name: string,
    description?: string,
    icon: string | IconDefinition = faBolt
  ) {
    super(id, name, description, icon);
  }

  async waitReady() {
    throw new Error("TriggerExtensionPoint.waitReady not implemented");
  }

  async install() {
    if (!(await this.isAvailable())) {
      return false;
    }
    await this.waitReady();
    return true;
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    properties: {
      action: {
        $ref: "#/definitions/effect",
      },
    },
    required: ["action"],
  };

  getBlocks(extension: IExtension<TriggerConfig>): IBlock[] {
    return blockList(extension.config.action);
  }

  async run(locator: ServiceLocator) {
    const reader = this.defaultReader();
    const readerContext = await reader.read();

    for (const extension of this.extensions) {
      const { action } = extension.config;
      const serviceContext = await makeServiceContext(
        extension.services,
        locator
      );
      await reducePipeline(action, readerContext, {
        validate: true,
        serviceArgs: serviceContext,
      });
    }
  }
}
