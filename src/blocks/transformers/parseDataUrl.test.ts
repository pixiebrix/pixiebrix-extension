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

import { ParseDataUrl } from "@/blocks/transformers/parseDataUrl";
import { BlockArg, BlockOptions } from "@/core";

const block = new ParseDataUrl();

describe("parseDataUrl", () => {
  // Examples from: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs#syntax
  it.each([
    ["data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=="],
    ["data:,Hello%2C%20World%21"],
  ])("text-decodes URL: %s", async (url) => {
    const result = await block.run(
      {
        url,
        decode: true,
      } as unknown as BlockArg,
      {} as BlockOptions
    );

    expect(result).toStrictEqual({
      mimeType: "text/plain",
      encoding: "windows-1252", // `windows-1252` is ASCII, the default for data URLs
      body: "Hello, World!",
    });
  });

  it("parses PNG URL", async () => {
    const base64 =
      "iVBORw0KGgoAAAANSUhEUgAAAEoAAAAPCAIAAADMJ875AAAACXBIWXMAAAHqAAAB6gFenlSlAAAEYklEQVRIid1XTUwbRxTeNnaEZ/uzzu5GKs66FtQMJWq1hnLZvSDVHCGHKoKeIjgmVLkgol7ahGPTY3IsPkWFWzG3rg+tgrcHt7GlFqTFLXE8Mqnq3bBqtWOIUanMM8NiG0e9NX0n75u3b9973/fNjF85PDzkjo0Ql9I6d9oURUAoyL2cFoCqLauaWso5ttexCYzl63P6y9hkAz3H9hbvGICbogiJ4QisUfo8YxThN8by/MIYILzydYG9L0r85OSQKPHgV6LC1LTa8UsvDABbWS6Qssse1UQkOR7vGGlmS2a2pOkxTY+dla2Bnmk+YZxMDEd+fby7s/PnByOR3ksCxrJlVQFeQlxFESitg6dpVrWQr3z2+Xirv81eGNCcQtn1h1lW1XG8jhNxHGpZVTx4sUu2QLsrHA5NXX3vx58qe3sHfr9flgCmY3t3737v2J5pPvkwGZ9fGOtCYEURugf4bX5hDGM5YxRXlgsZo9ixPU17ewDLkoj+XXvb289+237W33dh5+lf3YsQJV7XY+nVjaNZemurG0pU0PQYsHfiymWMZSCbmojgQRkCoNa19GbG2IKRaXpsalpt7xwPyhzHgR+4LUq8Y3uWVdX0GMYykBMRF0Q0MzsqSvz9e2aNPk+Ox9VEpEN7kxPv7u7WansHfX0Xflh/3LExYFqtIc4tjuNCoSDjnjItiBJvZkv2Ui6ZjGeMoijxmh4j5IR1GaOYXt1AKIixTIhrZksIBf0QwYAIaYgQ/M38xxkkiWfk1PSh9OomIW5qKadEhUK+grGsJiKn0IMDoHwk63LZlSQEk8NYth3asqkS4n75xXcMQ6ierU5Nq6TsNua93KjyxpzWgkwmUwQGgphvfvJNCwP92QAi9nhjToPS19KbfufiHcOyqpZVRSh4fU4Hf4CV+NHV9x+ul8LhkOPuRaPC8Mgla8t+Z+Diz7/8PnHlMmsGDKGgogiwszXocbr6BhQfq/CKpscg0m8wrMXbRsvIWCRoD7RtWVUzWxIlHjQPvbWYKPFT02pqKQfDZfU025NEBErr7xe/NYqi0LO3f1A/+Ptc4BxC59vTwT7R7vePHH4U8hVC4u0dchyXHI/7k6NQq/ZEiW8IzPYch0J7XYydYen0ppqIQIev+uN7e98Ih0Oh48/s7x88ePCop6eDPrsbnEiixKuJCKX11Fe5lssQkI2U3QEsD2C5XHZt2/M3YGZLa+nN1FIOxiR23R6bpyVxMZYVRXBsD2A8Qc92aO9brz9cL9Vq9XA41NgtegKv8eevXRspHx+y3bdgZkxyM7OjiiJ8eusP8Pj1Mzk5BDqxjjnfAi8DH2ah6bEuZ2YhX8kYRYSCM7OjtFZfvG2AJzkeP7m1HEmoSZX8o4oo8dGowB4RCgIbKa0T4jLtMWN+FAraDmUBju3ZDoUG/C9SWi/kK05z6U2mqJZ7ryQiQLX9u5BZEhGt1SmtsyXIAI/NKzUh7v175ll3zrPOpf++nfrH8D8zjuP+AccBgnAyEo5/AAAAAElFTkSuQmCC";
    const url = `data:image/png;base64,${base64}`;

    const result = await block.run(
      {
        url,
        decodeText: false,
      } as unknown as BlockArg,
      {} as BlockOptions
    );

    expect(result).toStrictEqual({
      mimeType: "image/png",
      // FIXME: why is the encoding reported as "windows-1252"
      encoding: "windows-1252",
      body: base64,
    });
  });
});
