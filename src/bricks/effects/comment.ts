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

import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import { propertiesToSchema } from "@/utils/schemaUtils";

class CommentEffect extends EffectABC {
  // Use an effect so PixieBrix doesn't show an output

  static BRICK_ID = validateRegistryId("@pixiebrix/comment");

  static SCHEMA = propertiesToSchema(
    {
      comment: {
        title: "Comment",
        type: "string",
        description: "The comment/note",
      },
    },
    [],
  );

  override async isPure(): Promise<boolean> {
    return true;
  }

  override async isPageStateAware(): Promise<boolean> {
    return false;
  }

  override async isRootAware(): Promise<boolean> {
    return false;
  }

  constructor() {
    super(
      CommentEffect.BRICK_ID,
      "Comment",
      "A brick to record comments/notes for mod developers",
    );
  }

  inputSchema: Schema = CommentEffect.SCHEMA;

  async effect(): Promise<void> {
    // NOP
  }
}

export default CommentEffect;
