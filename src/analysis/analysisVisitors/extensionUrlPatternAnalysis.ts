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

import { Analysis, Annotation, AnnotationType } from "@/analysis/analysisTypes";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { joinPathParts } from "@/utils";

class ExtensionUrlPatternAnalysis implements Analysis {
  get id() {
    return "urlPattern";
  }

  private readonly annotations: Annotation[] = [];
  getAnnotations(): Annotation[] {
    return this.annotations;
  }

  public run(extension: FormState): void {
    const { urlPatterns } = extension.extensionPoint.definition.isAvailable;
    if (urlPatterns == null || urlPatterns.length === 0) {
      return;
    }

    for (const [index, urlPattern] of Object.entries(urlPatterns)) {
      for (const [key, pattern] of Object.entries(urlPattern)) {
        if (pattern == null || pattern === "") {
          continue;
        }

        try {
          void new URLPattern({ [key]: pattern });
        } catch {
          this.annotations.push({
            position: {
              path: joinPathParts(
                "extensionPoint.definition.isAvailable.urlPatterns",
                index,
                key
              ),
            },
            message: `Invalid pattern for ${key}`,
            analysisId: this.id,
            type: AnnotationType.Error,
            detail: urlPattern,
          });
        }
      }
    }
  }
}

export default ExtensionUrlPatternAnalysis;
