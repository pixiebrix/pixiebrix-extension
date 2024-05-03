import {
  type ProcessDataMap,
  SET_COPILOT_DATA_MESSAGE_TYPE,
} from "@/contrib/automationanywhere/aaTypes";
import { getNotifier, type MessengerMeta } from "webext-messenger";

type SetCopilotDataRequest = {
  /**
   * Mapping from process ID to data.
   */
  data: ProcessDataMap;
};

/**
 * Message the frame parent of the copilot frame to set data on the copilot form.
 * @since 1.8.5
 * @see initCopilotMessenger
 */
export async function setCopilotProcessData(
  this: MessengerMeta,
  request: SetCopilotDataRequest,
): Promise<void> {
  const sourceTabId = this.trace[0]?.tab?.id;

  console.debug("Sending AA Co-Pilot data to frames", {
    data: request.data,
  });

  // Can't use browser.webNavigation.getAllFrames because it doesn't return extension frames
  // https://github.com/pixiebrix/pixiebrix-extension/pull/7109#discussion_r1424839790
  for (const page of ["/frame.html", "/sidebar.html"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- receiver not using webext-messenger
    const notifier = getNotifier(SET_COPILOT_DATA_MESSAGE_TYPE as any, {
      tabId: sourceTabId,
      page,
    });
    notifier(request.data);
  }
}
