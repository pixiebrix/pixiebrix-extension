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

import { ReaderABC } from "@/types/bricks/readerTypes";
import { startCase } from "lodash";
import { withReadWindow } from "@/pageScript/messenger/api";
import { type PathSpec } from "@/bricks/readers/window";
import { type JsonObject } from "type-fest";
import { mapObject } from "@/utils/objectUtils";

export async function checkRoute(expectedRoute: string): Promise<boolean> {
  const { route } = await withReadWindow({
    pathSpec: { route: "app.router?.lastRoute" },
  });
  return route === expectedRoute;
}

export class PipedriveReader extends ReaderABC {
  private get ROOT_PATH() {
    return "app.router.currentView.model.attributes";
  }

  resourceType: string;

  pathSpec: PathSpec;

  constructor(resourceType: string, pathSpec: PathSpec) {
    super(
      `pipedrive/${resourceType}`,
      `Pipedrive ${startCase(resourceType)} Reader`,
      `Read information from the Pipedrive ${resourceType} page`
    );
    this.resourceType = resourceType;
    this.pathSpec = pathSpec;
    this.outputSchema = {
      type: "object",
      properties: Object.fromEntries(
        Object.keys(this.pathSpec).map((x) => [x, {}])
      ),
    };
  }

  async isAvailable() {
    return checkRoute(this.resourceType);
  }

  async read(): Promise<JsonObject> {
    // TODO: This casting doesn't make sense but it's how it worked before
    const castSpec =
      typeof this.pathSpec === "string"
        ? Object.fromEntries([...this.pathSpec].entries())
        : this.pathSpec;
    return withReadWindow({
      pathSpec: mapObject(castSpec, (x: string) => `${this.ROOT_PATH}.${x}`),
    });
  }
}

export const ORGANIZATION_READER = new PipedriveReader("organization", {
  organizationId: "id",
  organizationName: "name",
});

export const PERSON_READER = new PipedriveReader("person", {
  personId: "id",
  personName: "name",
});

export const DEAL_READER = new PipedriveReader("deal", {
  dealId: "id",
  title: "title",
  active: "active",
  personId: "person_id",
  personName: "person_name",
  organizationId: "org_id",
  organizationName: "org_name",
});
