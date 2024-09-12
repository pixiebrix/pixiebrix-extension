/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import axios from "axios";
import { lexicon, transformLexicon } from "@/telemetry/lexicon";

async function uploadLexicon() {
  const transformedLexicon = transformLexicon(lexicon);

  const {
    MIXPANEL_PROJECT_ID,
    MIXPANEL_SERVICE_ACCOUNT_USERNAME,
    MIXPANEL_SERVICE_ACCOUNT_SECRET,
  } = process.env;

  for (const [key, value] of Object.entries({
    MIXPANEL_PROJECT_ID,
    MIXPANEL_SERVICE_ACCOUNT_USERNAME,
    MIXPANEL_SERVICE_ACCOUNT_SECRET,
  })) {
    if (!value) {
      throw new Error(`${key} is required`);
    }
  }

  try {
    const response = await axios.post(
      `https://mixpanel.com/api/app/projects/${MIXPANEL_PROJECT_ID}/schemas`,
      transformedLexicon,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${MIXPANEL_SERVICE_ACCOUNT_USERNAME}:${MIXPANEL_SERVICE_ACCOUNT_SECRET}`,
          ).toString("base64")}`,
        },
      },
    );

    console.log("Lexicon uploaded successfully:", response.data);
  } catch (error) {
    console.error("Error uploading lexicon:", error);
  }
}

void uploadLexicon();
