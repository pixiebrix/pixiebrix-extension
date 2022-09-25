/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import type { StreamingAPIConnection } from "@symblai/symbl-web-sdk";
import { castArray, isEmpty } from "lodash";

// eslint-disable-next-line prefer-destructuring -- process.env
const SYMBLAI_APP_ID = process.env.SYMBLAI_APP_ID;
// eslint-disable-next-line prefer-destructuring -- process.env
const SYMBLAI_APP_SECRET = process.env.SYMBLAI_APP_SECRET;

let connection: StreamingAPIConnection;

export async function connect(): Promise<void> {
  if (isEmpty(SYMBLAI_APP_ID)) {
    throw new Error("Symbl.ai is not configured");
  }

  if (connection) {
    throw new Error("Connection already exists");
  }

  const { Symbl } = await import(
    /* webpackChunkName: "symbl" */ "@symblai/symbl-web-sdk"
  );

  // https://docs.symbl.ai/docs/web-sdk
  const symbl = new Symbl({
    reconnectOnError: true,

    // XXX: appId, appSecret are used for development. Use accessToken for production.
    appId: SYMBLAI_APP_ID, // Should only be used for development environment
    appSecret: SYMBLAI_APP_SECRET,
  });

  // Open a Streaming API WebSocket Connection and start processing audio from your input device.
  connection = await symbl.createAndStartNewConnection({
    insightTypes: ["action_item", "question", "follow_up"],
  });

  connection.on("conversation_created", (conversationData: any) => {
    const { conversationId } = conversationData.data;
    console.log("conversation_created", { conversationId });
  });

  // Retrieve real-time transcription from the conversation.
  connection.on("speech_recognition", (speechData: any) => {
    const name: string = speechData.user ? speechData.user.name : "User";
    const { transcript } = speechData.punctuated;
    console.debug(`${name}:`, transcript);
  });

  // Retrieve real-time transcription from the conversation.
  connection.on("topic", (data: any) => {
    console.debug("topic analysis", data);
    for (const topic of castArray(data)) {
      const event = new CustomEvent("audio:topic", {
        detail: topic,
        bubbles: true,
      });
      document.dispatchEvent(event);
    }
  });

  connection.on("question", (data: any) => {
    console.debug("question", data);
    for (const topic of castArray(data)) {
      const event = new CustomEvent("audio:question", {
        detail: topic,
        bubbles: true,
      });
      document.dispatchEvent(event);
    }
  });

  connection.on("action_item", (data) => {
    console.log("action_item", data);
  });

  connection.on("follow_up", (data) => {
    console.log("follow_up", data);
  });
}

export async function disconnect(): Promise<void> {
  await connection?.stopProcessing();
  await connection?.disconnect();
  connection = null;
}
