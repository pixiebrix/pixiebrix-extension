import { checkAvailable } from "@/blocks/available";
import { ExtensionPoint } from "@/types";
import { propertiesToSchema } from "@/validators/generic";
import blockRegistry from "@/blocks/registry";
import { IBlock, IExtension, IReader, ReaderOutput } from "@/core";
import { awaitElementOnce } from "@/extensionPoints/helpers";
import extensionPointRegistry from "@/extensionPoints/registry";
import {
  BlockConfig,
  BlockPipeline,
  makeServiceContext,
  reducePipeline,
} from "@/blocks/combinators";

interface CalendarConfig {
  ranges: BlockConfig | BlockPipeline;
}

interface RangeConfig {
  color: string;
  days: string[];
  startTime: string;
  endTime: string;
}

class CalendarTimeRange extends ExtensionPoint<CalendarConfig> {
  private $container: JQuery;

  constructor() {
    super(
      `pipedrive/calendar-range`,
      `Pipedrive Calendar Range`,
      `Add ranges to the Pipedrive activity calendar`
    );
  }

  getBlocks(): IBlock[] {
    return [];
  }

  inputSchema = propertiesToSchema({
    ranges: {
      oneOf: [
        { $ref: "https://app.pixiebrix.com/schemas/transformer#" },
        {
          type: "array",
          items: { $ref: "https://app.pixiebrix.com/schemas/block#" },
        },
      ],
    },
  });

  permissions = {
    permissions: ["tabs", "webNavigation"],
    origins: ["https://*.pipedrive.com/activities/calendar/*"],
  };

  async isAvailable(): Promise<boolean> {
    return checkAvailable({
      matchPatterns: ["https://*.pipedrive.com/activities/calendar/*"],
    });
  }

  defaultReader() {
    return blockRegistry.lookup(`@pixiebrix/document-context`) as IReader;
  }

  async install(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      return false;
    }
    this.$container = await awaitElementOnce('[class^="_calendar__grid"]');
    return true;
  }

  async runExtension(
    readerContext: ReaderOutput,
    extension: IExtension<CalendarConfig>
  ): Promise<void> {
    const extensionLogger = this.logger.childLogger({
      extensionId: extension.id,
    });
    const serviceContext = await makeServiceContext(extension.services);

    const { ranges } = extension.config;

    const rangeConfigs = (await reducePipeline(
      ranges,
      readerContext,
      extensionLogger,
      {
        validate: true,
        serviceArgs: serviceContext,
      }
    )) as RangeConfig[];

    const $hourLabels = $("[class^='_calendar__hourLabel__']");
    const $dayHeaders = $("[class^='_header__day_']");
    const $gridDays = $("[class^='_grid-day__day__']");

    const getTop = (time: string) => {
      const $label = $hourLabels.filter(function () {
        return $(this).text().trim() === time;
      });
      return Number.parseInt($label.css("top"), 10);
    };

    for (const { days, color, startTime, endTime } of rangeConfigs) {
      const startTop = getTop(startTime) + 12;
      const endTop = getTop(endTime) + 12;
      const colorString = `#${color}30`;
      $gridDays
        .filter(function (index) {
          return days.some((x) => $($dayHeaders.get(index)).text().includes(x));
        })
        .prepend(
          `<div style='top: ${startTop}px; position: absolute; display: block; height: ${
            endTop - startTop
          }px; background-color: ${colorString}; width: 100%'></div>`
        );
    }
  }

  async run() {
    if (this.$container?.length) {
      const reader = this.defaultReader();
      const readerContext = await reader.read();

      if (readerContext == null) {
        throw new Error("Reader returned null/undefined");
      }

      for (const extension of this.extensions) {
        try {
          await this.runExtension(readerContext, extension);
        } catch (ex) {
          this.logger.childLogger({ extensionId: extension.id }).error(ex);
        }
      }
    }
  }
}

extensionPointRegistry.register(new CalendarTimeRange());
