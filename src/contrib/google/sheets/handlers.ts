import AppendValuesResponse = gapi.client.sheets.AppendValuesResponse;
import BatchGetValuesResponse = gapi.client.sheets.BatchGetValuesResponse;
import BatchUpdateSpreadsheetResponse = gapi.client.sheets.BatchUpdateSpreadsheetResponse;
import { liftBackground } from "@/background/protocol";

const GOOGLE_SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function ensureAuth(
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

const actionId = (x: string) => `GOOGLE_SHEETS_${x}`;

export const createTab = liftBackground(
  actionId("CREATE_TAB"),
  async (spreadsheetId: string, tabName: string) => {
    await ensureAuth();
    return (await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName,
              },
            },
          },
        ],
      },
    })) as BatchUpdateSpreadsheetResponse;
  }
);

export const appendRows = liftBackground(
  actionId("APPEND_ROWS"),
  async (spreadsheetId: string, tabName: string, values: any[]) => {
    await ensureAuth();
    return (await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: tabName,
      valueInputOption: "USER_ENTERED",
      resource: {
        majorDimension: "ROWS",
        values,
      },
    })) as AppendValuesResponse;
  }
);

export const batchUpdate = liftBackground(
  actionId("BATCH_UPDATE"),
  async (spreadsheetId: string, requests: any[]) => {
    await ensureAuth();
    return (await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests,
      },
    })) as BatchUpdateSpreadsheetResponse;
  }
);

export const batchGet = liftBackground(
  actionId("BATCH_GET"),
  async (spreadsheetId: string, ranges: string | string[]) => {
    await ensureAuth();
    const sheetRequest = gapi.client.sheets.spreadsheets.values.batchGet({
      spreadsheetId: spreadsheetId,
      ranges,
    });
    return await new Promise<BatchGetValuesResponse>((resolve) =>
      sheetRequest.execute((r) => resolve(r.result))
    );
  }
);

// export function sheetsHandler(
//   request: SheetsRequest,
//   sender: MessageSender,
//   sendResponse: (response: SheetResponse) => void
// ): boolean {
//   if (MESSAGE_TYPES.includes(request.type)) {
//     console.log(`sheetsHandler ${request.type}`, { request });
//     handler(request)
//       .then((response) => {
//         sendResponse({ success: true, response });
//       })
//       .catch((err) => {
//         console.debug(`sheetsHandler ${request.type} error`, { request, err });
//         if (err.result.error.code === 404) {
//           sendResponse({
//             error:
//               "Cannot locate the Google sheet. Have you been granted access?",
//           });
//         } else if (err.result.error.code === 403) {
//           reportError(err);
//           sendResponse({
//             error: "Internal error: cannot connect to Google Sheets",
//           });
//         } else {
//           sendResponse({ error: err.result.error?.message ?? "Unknown error" });
//         }
//       });
//     return true;
//   } else if (request.type) {
//     console.debug(`sheetsHandler ignoring request with type ${request.type}`);
//   }
//   return false;
// }
