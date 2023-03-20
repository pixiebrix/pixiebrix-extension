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
import { ParseDate } from "./parseDate";
import { ScreenshotTab } from "./screenshotTab";
import { TableReader, TablesReader } from "./component/TableReader";
import ParseJson from "./ParseJson";
import ForEach from "./controlFlow/ForEach";
import IfElse from "./controlFlow/IfElse";
import TryExcept from "./controlFlow/TryExcept";
import ForEachElement from "@/blocks/transformers/controlFlow/ForEachElement";
import { RandomNumber } from "@/blocks/transformers/randomNumber";
import Retry from "@/blocks/transformers/controlFlow/Retry";
import DisplayTemporaryInfo from "@/blocks/transformers/temporaryInfo/DisplayTemporaryInfo";
import TraverseElements from "@/blocks/transformers/traverseElements";
import TourStepTransformer from "@/blocks/transformers/tourStep/tourStep";
import { type IBlock } from "@/core";
import { SelectElement } from "@/blocks/transformers/selectElement";

function getAllTransformers(): IBlock[] {
  return [
    new JQTransformer(),
    new ParseJson(),
    new JSONPathTransformer(),
    new GetAPITransformer(),
    new RemoteMethod(),
    new RegexTransformer(),
    new MappingTransformer(),
    new IdentityTransformer(),
    new UrlParser(),
    new FormData(),
    new Prompt(),
    new DetectElement(),
    new FormTransformer(),
    new Base64Encode(),
    new Base64Decode(),
    new TemplateTransformer(),
    new UrlParams(),
    new JQueryReader(),
    new ComponentReader(),
    new TableReader(),
    new TablesReader(),
    new ParseCsv(),
    new ParseDataUrl(),
    new ParseDate(),
    new ScreenshotTab(),
    new RandomNumber(),
    new TraverseElements(),
    new SelectElement(),

    // Control Flow Bricks
    new ForEach(),
    new IfElse(),
    new TryExcept(),
    new ForEachElement(),
    new Retry(),

    // Render Pipelines
    new DisplayTemporaryInfo(),
    new TourStepTransformer(),
  ];
}

export default getAllTransformers;
