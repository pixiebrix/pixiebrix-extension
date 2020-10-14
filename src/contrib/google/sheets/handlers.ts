import AppendValuesResponse = gapi.client.sheets.AppendValuesResponse;
import BatchGetValuesResponse = gapi.client.sheets.BatchGetValuesResponse;
import BatchUpdateSpreadsheetResponse = gapi.client.sheets.BatchUpdateSpreadsheetResponse;
import { liftBackground } from "@/background/protocol";

const GOOGLE_SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export const DISCOVERY_DOCS = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

const actionId = (x: string) => `GOOGLE_SHEETS_${x}`;

function ensureAuth(
  { interactive }: { interactive: boolean } = { interactive: true }
): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive, scopes: GOOGLE_SHEETS_SCOPES },
      (token: string) => {
        if (chrome.runtime.lastError != null) {
          reject(
            new Error(
              `Cannot get Chrome OAuth token: ${chrome.runtime.lastError.message}`
            )
          );
        } else if (token) {
          // https://bumbu.me/gapi-in-chrome-extension
          gapi.auth.setToken({ access_token: token } as any);
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

async function handleRejection(token: string, err: any): Promise<Error> {
  if (err.result.error.code === 404) {
    throw new Error(
      "Cannot locate the Google drive resource. Have you been granted access?"
    );
  } else if ([403, 401].includes(err.result.error.code)) {
    await new Promise<void>((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        resolve();
      });
    });
    console.debug(
      "Bad Google OAuth token. Removed the auth token from the cache so the user can re-authenticate"
    );
    throw new Error(
      `Internal error connecting to Google Sheets. Details: ${err.result.error?.message}`
    );
  } else {
    throw new Error(err.result.error?.message ?? "Unknown error");
  }
}

export const createTab = liftBackground(
  actionId("CREATE_TAB"),
  async (spreadsheetId: string, tabName: string) => {
    const token = await ensureAuth();
    try {
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
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);

export const appendRows = liftBackground(
  actionId("APPEND_ROWS"),
  async (spreadsheetId: string, tabName: string, values: any[]) => {
    const token = await ensureAuth();
    try {
      return (await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: tabName,
        valueInputOption: "USER_ENTERED",
        resource: {
          majorDimension: "ROWS",
          values,
        },
      })) as AppendValuesResponse;
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);

export const batchUpdate = liftBackground(
  actionId("BATCH_UPDATE"),
  async (spreadsheetId: string, requests: any[]) => {
    const token = await ensureAuth();
    try {
      return (await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests,
        },
      })) as BatchUpdateSpreadsheetResponse;
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);

export const batchGet = liftBackground(
  actionId("BATCH_GET"),
  async (spreadsheetId: string, ranges: string | string[]) => {
    const token = await ensureAuth();
    try {
      const sheetRequest = gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId: spreadsheetId,
        ranges,
      });
      return await new Promise<BatchGetValuesResponse>((resolve) =>
        sheetRequest.execute((r) => resolve(r.result))
      );
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);
