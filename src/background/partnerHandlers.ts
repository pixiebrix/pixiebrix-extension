import type { MessengerMeta } from "webext-messenger";
import { type UnknownObject } from "@/types/objectTypes";
import {
  SET_COPILOT_DATA,
  type SetCopilotDataMessage,
} from "@/contrib/automationanywhere/frameProtocol";

type SetCopilotDataRequest = {
  /**
   * Mapping from process ID to data.
   */
  data: Record<string, UnknownObject>;
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

  // FIXME: this isn't what we want. It returns the normal frames, not the extension frames on the page.
  const frames = await browser.webNavigation.getAllFrames({
    tabId: sourceTabId,
  });

  console.debug("Sending AA Co-Pilot data to frames", {
    frames,
    data: request.data,
  });

  await Promise.allSettled(
    frames.map(async ({ frameId }) => {
      await browser.tabs.sendMessage(
        sourceTabId,
        {
          type: SET_COPILOT_DATA,
          args: {
            data: request.data,
          },
        } satisfies SetCopilotDataMessage,
        {
          frameId,
        },
      );
    }),
  );
}
