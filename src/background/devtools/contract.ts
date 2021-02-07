import { Runtime, WebNavigation } from "webextension-polyfill-ts";
import { HandlerOptions } from "@/messaging/protocol";

export const PORT_NAME = "devtools-page";
export const MESSAGE_PREFIX = "@@pixiebrix/devtools/";

export type TabId = number;
export type Nonce = string;

export type PromiseHandler = [
  (value: unknown) => void,
  (value: unknown) => void
];

export type BackgroundEventType =
  | "HistoryStateUpdate"
  | "DOMContentLoaded"
  | "ContentScriptReady";

export type BackgroundEvent =
  | {
      type: "HistoryStateUpdate";
      meta: Meta;
      payload: WebNavigation.OnHistoryStateUpdatedDetailsType;
    }
  | {
      type: "DOMContentLoaded";
      meta: Meta;
      payload: WebNavigation.OnDOMContentLoadedDetailsType;
    }
  | {
      type: "ContentScriptReady";
      meta: Meta;
      payload: { frameId: number; tabId: TabId };
    };

export interface BackgroundResponse {
  type: string;
  meta: Meta;
  payload: unknown;
}

export interface HandlerEntry {
  handler: (
    tabId: number,
    port: Runtime.Port
  ) => (...args: unknown[]) => unknown | Promise<unknown>;
  options: HandlerOptions;
}

export interface Meta {
  nonce: Nonce;
  tabId: TabId;
}
