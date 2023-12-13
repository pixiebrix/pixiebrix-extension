import type { MessengerMeta } from "webext-messenger";
import { type UnknownObject } from "@/types/objectTypes";
import { SET_COPILOT_DATA } from "@/contrib/automationanywhere/frameProtocol";

type SetCopilotDataRequest = {
  /**
   * The frame id to send the message to. Should be the direct parent of the copilot frame
   */
  frameId?: number;
  /**
   * The automation anywhere process id
   */
  processId: string;
  /**
   * The data to set on the copilot form
   */
  data: UnknownObject;
};

/**
 * Message the frame parent of the copilot frame to set data on the copilot form.
 * @since 1.8.5
 */
export async function setCopilotProcessData(
  this: MessengerMeta,
  request: SetCopilotDataRequest,
): Promise<void> {
  const sourceTabId = this.trace[0].tab.id;

  const { frameId, ...data } = request;

  let frameIds;

  if (frameId) {
    frameIds = [frameId];
  } else {
    const frames = await browser.webNavigation.getAllFrames({
      tabId: sourceTabId,
    });

    frameIds = frames.map((x) => x.frameId);
  }

  console.debug("Sending AA Co-Pilot data to frames", { frameIds, data });

  await Promise.allSettled(
    frameIds.map(async (frameId) => {
      await browser.tabs.sendMessage(
        sourceTabId,
        {
          type: SET_COPILOT_DATA,
          data,
        },
        {
          frameId,
        },
      );
    }),
  );
}
