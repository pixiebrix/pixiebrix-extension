/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { registerBlock } from "@/blocks/registry";

import { JQTransformer } from "./jq";
import { JSONPathTransformer } from "./jsonPath";
import { GetAPITransformer } from "./httpGet";
import { RemoteMethod } from "./remoteMethod";
import { RegexTransformer } from "./regex";
import { MappingTransformer } from "./mapping";
import { IdentityTransformer } from "./identity";
import { UrlParser } from "./parseUrl";
import { FormData } from "./FormData";
import { Prompt } from "./prompt";
import { DetectElement } from "./detect";
import { FormTransformer } from "./ephemeralForm/formTransformer";
import { Base64Decode, Base64Encode } from "./encode";
import { TemplateTransformer } from "./template";
import { UrlParams } from "./url";
import { ComponentReader } from "./component/ComponentReader";
import { JQueryReader } from "./jquery/JQueryReader";
import { ParseCsv } from "./parseCsv";
import { ParseDataUrl } from "./parseDataUrl";
import { ParseDate } from "@/blocks/transformers/parseDate";
import { ScreenshotTab } from "@/blocks/transformers/screenshotTab";
import { TableReader } from "./component/TableReader";

function registerTransformers() {
  registerBlock(new JQTransformer());
  registerBlock(new JSONPathTransformer());
  registerBlock(new GetAPITransformer());
  registerBlock(new RemoteMethod());
  registerBlock(new RegexTransformer());
  registerBlock(new MappingTransformer());
  registerBlock(new IdentityTransformer());
  registerBlock(new UrlParser());
  registerBlock(new FormData());
  registerBlock(new Prompt());
  registerBlock(new DetectElement());
  registerBlock(new FormTransformer());
  registerBlock(new Base64Encode());
  registerBlock(new Base64Decode());
  registerBlock(new TemplateTransformer());
  registerBlock(new UrlParams());
  registerBlock(new JQueryReader());
  registerBlock(new ComponentReader());
  registerBlock(new TableReader());
  registerBlock(new ParseCsv());
  registerBlock(new ParseDataUrl());
  registerBlock(new ParseDate());
  registerBlock(new ScreenshotTab());
}

export default registerTransformers;
