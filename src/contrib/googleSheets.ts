import {
  GOOGLE_SHEETS_APPEND,
  GOOGLE_SHEETS_BATCH_UPDATE,
  GOOGLE_SHEETS_GET,
} from "@/messaging/constants";
import MessageSender = chrome.runtime.MessageSender;
import AppendValuesResponse = gapi.client.sheets.AppendValuesResponse;
import BatchGetValuesResponse = gapi.client.sheets.BatchGetValuesResponse;
import BatchUpdateSpreadsheetResponse = gapi.client.sheets.BatchUpdateSpreadsheetResponse;
import { reportError } from "@/telemetry/rollbar";

const GOOGLE_SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function withAuth(
  { interactive }: { interactive: boolean } = { interactive: true }
): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive, scopes: GOOGLE_SHEETS_SCOPES },
      (token: string) => {
        if (chrome.runtime.lastError != null) {
          reject(chrome.runtime.lastError.message);
        } else if (token) {
          resolve(token);
        } else {
          reject("Could not get Chrome OAuth token");
        }
      }
    );
    if (chrome.runtime.lastError != null) {
      reject(chrome.runtime.lastError.message);
    }
  });
}

const MESSAGE_TYPES = [
  GOOGLE_SHEETS_APPEND,
  GOOGLE_SHEETS_GET,
  GOOGLE_SHEETS_BATCH_UPDATE,
];

interface AppendRequest {
  type: typeof GOOGLE_SHEETS_APPEND;
  payload: { spreadsheetId: string; tabName: string; values: any[] };
}
interface BatchGetRequest {
  type: typeof GOOGLE_SHEETS_GET;
  payload: { spreadsheetId: string; ranges: string | string[] };
}
interface BatchUpdateRequest {
  type: typeof GOOGLE_SHEETS_BATCH_UPDATE;
  payload: { spreadsheetId: string; requests: any[] };
}

type SheetsRequest = AppendRequest | BatchGetRequest | BatchUpdateRequest;

class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

async function handler(
  request: SheetsRequest
): Promise<
  BatchGetValuesResponse | AppendValuesResponse | BatchUpdateSpreadsheetResponse
> {
  // https://bumbu.me/gapi-in-chrome-extension
  const token = await withAuth();

  // @ts-ignore: the type definition has other fields, e.g. error on there
  gapi.auth.setToken({
    access_token: token,
  });

  switch (request.type) {
    case GOOGLE_SHEETS_APPEND: {
      const { spreadsheetId, tabName, values } = request.payload;
      return (await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: tabName,
        valueInputOption: "USER_ENTERED",
        resource: {
          majorDimension: "ROWS",
          values,
        },
      })) as any;
    }
    case GOOGLE_SHEETS_BATCH_UPDATE: {
      const { spreadsheetId, requests } = request.payload;
      return (await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests,
        },
      })) as any;
    }
    case GOOGLE_SHEETS_GET: {
      const { spreadsheetId, ranges } = request.payload;
      const sheetRequest = gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: spreadsheetId,
        ranges,
      });
      return await new Promise((resolve) =>
        sheetRequest.execute((r) => resolve(r.result))
      );
    }
    default: {
      // @ts-ignore: not possible via the type information
      if (request.type) {
        // @ts-ignore: not possible via the type information
        throw new ProtocolError(`Unexpected type ${request.type}`);
      }
    }
  }
}

type SheetResponse = { success: true; response: unknown } | { error: string };

export function sheetsHandler(
  request: SheetsRequest,
  sender: MessageSender,
  sendResponse: (response: SheetResponse) => void
): boolean {
  if (MESSAGE_TYPES.includes(request.type)) {
    console.log(`sheetsHandler ${request.type}`, { request });
    handler(request)
      .then((response) => {
        sendResponse({ success: true, response });
      })
      .catch((err) => {
        console.debug(`sheetsHandler ${request.type} error`, { request, err });
        if (err.result.error.code === 404) {
          sendResponse({
            error:
              "Cannot locate the Google sheet. Have you been granted access?",
          });
        } else if (err.result.error.code === 403) {
          reportError(err);
          sendResponse({
            error: "Internal error: cannot connect to Google Sheets",
          });
        } else {
          sendResponse({ error: err.result.error?.message ?? "Unknown error" });
        }
      });
    return true;
  } else if (request.type) {
    console.debug(`sheetsHandler ignoring request with type ${request.type}`);
  }
  return false;
}
