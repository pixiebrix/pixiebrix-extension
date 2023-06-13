/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import useCurrentOrigin from "@/contrib/google/sheets/useCurrentOrigin";
import { useCallback, useState } from "react";
import { isAuthRejectedError } from "@/contrib/google/auth";
import { isNullOrBlank } from "@/utils";
import { type Data, type Doc } from "@/contrib/google/sheets/types";
import pDefer from "p-defer";
import { reportEvent } from "@/telemetry/events";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors/businessErrors";
import { ensureSheetsReady } from "@/contrib/google/sheets/handlers";

const API_KEY = process.env.GOOGLE_API_KEY;
const APP_ID = process.env.GOOGLE_APP_ID;

const PICKER_LOAD_TIMEOUT_MS = 5000;

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
  ensureSheetsTokenAction: () => Promise<string>;
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
      const token = await ensureSheetsReady({
        maxRetries: 1,
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

  // Version of ensureSheetsToken wrapped with success/error message handlers
  const ensureSheetsTokenAction = useUserAction(
    ensureSheetsToken,
    {
      successMessage: "Connected to Google Sheets",
      errorMessage: "Error connecting to Google Sheets",
    },
    [ensureSheetsToken]
  );

  const showPicker = useCallback(async (): Promise<Doc> => {
    reportEvent("SelectGoogleSpreadsheetStart");

    if (pickerOrigin == null) {
      throw new Error("Unable to determine URL for File Picker origin");
    }

    if (isNullOrBlank(APP_ID)) {
      throw new Error("Internal error: Google app ID is not configured");
    }

    if (isNullOrBlank(API_KEY)) {
      throw new Error("Internal error: Google API key is not configured");
    }

    reportEvent("SelectGoogleSpreadsheetEnsureToken");
    const token = await ensureSheetsToken();

    reportEvent("SelectGoogleSpreadsheetLoadLibary");
    await new Promise((resolve, reject) => {
      // https://github.com/google/google-api-javascript-client/blob/master/docs/reference.md#----gapiloadlibraries-callbackorconfig------
      gapi.load("picker", {
        callback: resolve,
        onerror() {
          reject(new Error("gapi picker failed to load"));
        },
        timeout: PICKER_LOAD_TIMEOUT_MS,
        ontimeout() {
          reject(new Error("gapi picker failed to load before timeout"));
        },
      });
    });

    // https://developers.google.com/drive/picker/reference#docs-view
    const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS);

    const deferredPromise = pDefer<Doc>();

    reportEvent("SelectGoogleSpreadsheetShowPicker");
    const picker = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .setTitle("Select Spreadsheet")
      .setOAuthToken(token)
      .addView(view)
      // Why do we have both DocsView and DocsUploadView
      // https://developers.google.com/drive/picker/reference#docs-upload-view
      .addView(new google.picker.DocsUploadView())
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setCallback((data: Data) => {
        // The File Picker also does a callback for "loaded", but that action doesn't appear in the types and doesn't
        // appear in the documentation: https://developers.google.com/drive/picker/reference#callback-types
        // For now, report the event to help diagnose issues users are facing with the picker. In the future,
        // could consider making this a NOP.
        reportEvent("GoogleFilePickerEvent", {
          action: data.action,
        });

        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          if (doc.mimeType !== "application/vnd.google-apps.spreadsheet") {
            deferredPromise.reject(
              new Error(`${doc.name} is not a spreadsheet`)
            );
          }

          reportEvent("SelectGoogleSpreadsheetPicked");
          deferredPromise.resolve(doc);
        } else if (data.action === google.picker.Action.CANCEL) {
          reportEvent("SelectGoogleSpreadsheetCancelled");
          deferredPromise.reject(new CancelError("No spreadsheet selected"));
        }
      })
      .setOrigin(pickerOrigin)
      .build();

    picker.setVisible(true);

    return deferredPromise.promise;
  }, [ensureSheetsToken, pickerOrigin]);

  return {
    showPicker,
    ensureSheetsTokenAction,
    hasRejectedPermissions,
  };
}

export default useGoogleSpreadsheetPicker;
