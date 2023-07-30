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
import useCurrentOrigin from "@/contrib/google/sheets/core/useCurrentOrigin";
import { useCallback, useState } from "react";
import { isAuthRejectedError } from "@/contrib/google/auth";
import { isNullOrBlank } from "@/utils";
import { type Data, type Doc } from "@/contrib/google/sheets/core/types";
import pDefer from "p-defer";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import useUserAction from "@/hooks/useUserAction";
import { CancelError } from "@/errors/businessErrors";
import { ensureSheetsReady } from "@/contrib/google/sheets/core/sheetsApi";

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

  /**
   * The timestamp when ensureSheetsReady was called, or nu,ll if not waiting for a token. Used to determine if the
   * Chrome APIs for retrieving the token are hanging.
   */
  startTimestamp: number | null;
} {
  const pickerOrigin = useCurrentOrigin();

  // The timestamp when ensureSheetsReady was called. Used to determine if the Chrome identity APIs might be hanging.
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);

  // `true` if the user has explicitly rejected permissions when shown the authentication prompt
  const [hasRejectedPermissions, setHasRejectedPermissions] =
    useState<boolean>(false);

  // Get token, showing authentication UI if necessary
  const ensureSheetsToken = useCallback(async () => {
    try {
      setStartTimestamp(Date.now());
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
    } finally {
      setStartTimestamp(null);
    }
  }, [setHasRejectedPermissions, setStartTimestamp]);

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
    reportEvent(Events.SELECT_GOOGLE_SPREADSHEET_START);

    if (pickerOrigin == null) {
      throw new Error("Unable to determine URL for File Picker origin");
    }

    if (isNullOrBlank(APP_ID)) {
      throw new Error("Internal error: Google app ID is not configured");
    }

    if (isNullOrBlank(API_KEY)) {
      throw new Error("Internal error: Google API key is not configured");
    }

    reportEvent(Events.SELECT_GOOGLE_SPREADSHEET_ENSURE_TOKEN_START);
    const token = await ensureSheetsToken();

    reportEvent(Events.SELECT_GOOGLE_SPREADSHEET_LOAD_LIBRARY_START);
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

    reportEvent(Events.SELECT_GOOGLE_SPREADSHEET_SHOW_PICKER_START);
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
        reportEvent(Events.GOOGLE_FILE_PICKER_EVENT, {
          action: data.action,
        });

        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          if (doc.mimeType !== "application/vnd.google-apps.spreadsheet") {
            deferredPromise.reject(
              new Error(`${doc.name} is not a spreadsheet`)
            );
          }

          reportEvent(Events.SELECT_GOOGLE_SPREADSHEET_PICKED);
          deferredPromise.resolve(doc);
        } else if (data.action === google.picker.Action.CANCEL) {
          reportEvent(Events.SELECT_GOOGLE_SPREADSHEET_CANCELLED);
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
    startTimestamp,
  };
}

export default useGoogleSpreadsheetPicker;
