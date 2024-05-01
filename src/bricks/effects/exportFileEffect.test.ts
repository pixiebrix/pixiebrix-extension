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

import ExportFileEffect from "@/bricks/effects/exportFileEffect";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import download from "downloadjs";

jest.mock("downloadjs");

const downloadMock = jest.mocked(download);

describe("ExportFileEffect", () => {
  it("downloads GIF file", async () => {
    const brick = new ExportFileEffect();

    await brick.run(
      unsafeAssumeValidArg({
        data: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      }),
      brickOptionsFactory(),
    );

    expect(downloadMock).toHaveBeenCalledOnce();
  });
});
