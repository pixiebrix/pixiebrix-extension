/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/// <reference types="@maxim_mazurok/gapi.client.bigquery" />

import { liftBackground } from "@/background/protocol";
import { ensureAuth, handleRejection } from "@/contrib/google/auth";

const GOOGLE_BIGQUERY_SCOPES = [
  // 'https://www.googleapis.com/auth/bigquery.insertdata',
  "https://www.googleapis.com/auth/bigquery.readonly",
  "https://www.googleapis.com/auth/bigquery",
];

export const DISCOVERY_DOCS: string[] = [
  // Getting a 403 when requesting this - b/c mixing discovery versions?
  "https://bigquery.googleapis.com/discovery/v1/apis/bigquery/v2/rest",
];

const actionId = (x: string) => `GOOGLE_BIGQUERY_${x}`;

const initialized = false;

async function ensureBigQuery(): Promise<void> {
  if (initialized) {
    return;
  }

  // https://github.com/google/google-api-javascript-client/blob/master/docs/reference.md
  try {
    return await gapi.client.load("bigquery", "v2");
  } catch (reason) {
    console.debug("Error fetching BigQuery API definition", {
      error: reason.error,
    });
    throw new Error("Error fetching BigQuery API definition");
  }
}

export const readQuery = liftBackground(
  actionId("READ"),
  async (projectId: string, resource: gapi.client.bigquery.QueryRequest) => {
    console.debug("Read query", { projectId, resource });
    const token = await ensureAuth(GOOGLE_BIGQUERY_SCOPES);
    await ensureBigQuery();
    try {
      return await gapi.client.bigquery.jobs.query({
        projectId,
        prettyPrint: true,
        alt: "json",
        resource,
      });
    } catch (ex) {
      throw await handleRejection(token, ex);
    }
  }
);
