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
import {
  ChromeProfileReader,
  DocumentReader,
  ManifestReader,
  PixieBrixProfileReader,
  PixieBrixSessionReader,
  TimestampReader,
} from "./meta";
import { PageMetadataReader } from "./PageMetadataReader";
import { PageSemanticReader } from "./PageSemanticReader";
import { BlankReader } from "./BlankReader";
import { ImageReader } from "./ImageReader";
import { ImageExifReader } from "@/blocks/readers/ImageExifReader";
import { ElementReader } from "@/blocks/readers/ElementReader";

function registerReaders(): void {
  registerBlock(new DocumentReader());
  registerBlock(new ManifestReader());
  registerBlock(new ChromeProfileReader());
  registerBlock(new PixieBrixProfileReader());
  registerBlock(new PixieBrixSessionReader());
  registerBlock(new TimestampReader());
  registerBlock(new PageMetadataReader());
  registerBlock(new PageSemanticReader());
  registerBlock(new BlankReader());
  registerBlock(new ImageReader());
  registerBlock(new ImageExifReader());
  registerBlock(new ElementReader());
}

export default registerReaders;
