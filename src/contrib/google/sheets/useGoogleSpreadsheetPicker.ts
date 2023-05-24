import useCurrentOrigin from "@/contrib/google/sheets/useCurrentOrigin";
import { useCallback, useState } from "react";
import { ensureGoogleToken, isAuthRejectedError } from "@/contrib/google/auth";
import { GOOGLE_SHEETS_SCOPES } from "@/contrib/google/sheets/sheetsConstants";
import { isNullOrBlank } from "@/utils";
import { type Data, type Doc } from "@/contrib/google/sheets/types";
import pDefer from "p-defer";
import { reportEvent } from "@/telemetry/events";

const API_KEY = process.env.GOOGLE_API_KEY;
const APP_ID = process.env.GOOGLE_APP_ID;

/**
 * React Hook returning callback for showing a Google Spreadsheet file picker.
 * See https://developers.google.com/drive/picker/guides/overview
 */
function useGoogleSpreadsheetPicker(): {
  /**
   * Show the file picker, requesting permissions if token doesn't already have permissions.
   */
  showPicker: () => Promise<Doc>;
  /**
   * Ensure/request permissions, but don't show the picker. Tracks whether the user rejected permissions.
   * @see hasRejectedPermissions
   */
  ensureSheetsToken: () => Promise<string>;
  /**
   * True if the user reject permissions from the prompt, or permissions were rejected via Google account policy.
   */
  hasRejectedPermissions: boolean;
} {
  const pickerOrigin = useCurrentOrigin();
  const [hasRejectedPermissions, setHasRejectedPermissions] =
    useState<boolean>(false);

  const ensureSheetsToken = useCallback(async () => {
    try {
      const token = await ensureGoogleToken(GOOGLE_SHEETS_SCOPES, {
        interactive: true,
      });
      setHasRejectedPermissions(false);
      return token;
    } catch (error) {
      if (isAuthRejectedError(error)) {
        setHasRejectedPermissions(true);
      }

      throw error;
    }
  }, [setHasRejectedPermissions]);

  const showPicker = useCallback(async (): Promise<Doc> => {
    reportEvent("SelectGoogleSpreadsheetStart");

    if (pickerOrigin == null) {
      throw new Error("Unable to determine URL for File Picker origin");
    }

    const token = await ensureSheetsToken();

    await new Promise((resolve) => {
      gapi.load("picker", { callback: resolve });
    });

    if (isNullOrBlank(APP_ID)) {
      throw new Error("Internal error: Google app ID is not configured");
    }

    if (isNullOrBlank(API_KEY)) {
      throw new Error("Internal error: Google API key is not configured");
    }

    const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS);

    const deferredPromise = pDefer<Doc>();

    const picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .setTitle("Select Spreadsheet")
      .setOAuthToken(token)
      .addView(view)
      .addView(new google.picker.DocsUploadView())
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setCallback((data: Data) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          if (doc.mimeType !== "application/vnd.google-apps.spreadsheet") {
            deferredPromise.reject(
              new Error(`${doc.name} is not a spreadsheet`)
            );
          }

          reportEvent("SelectGoogleSpreadsheetFinish");
          deferredPromise.resolve(doc);
        }
      })
      .setOrigin(pickerOrigin)
      .build();

    picker.setVisible(true);

    return deferredPromise.promise;
  }, [ensureSheetsToken, pickerOrigin]);

  return {
    showPicker,
    ensureSheetsToken,
    hasRejectedPermissions,
  };
}

export default useGoogleSpreadsheetPicker;
