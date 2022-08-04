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
import { get, isEmpty } from "lodash";

const urlPatternFields = ["extensionPoint.definition.isAvailable.urlPatterns"];

const stringUrlFields = [
  "extensionPoint.definition.documentUrlPatterns",
  "extensionPoint.definition.isAvailable.matchPatterns",
  "permissions.origins",
];
class ExtensionUrlPatternAnalysis implements Analysis {
  get id() {
    return "urlPattern";
  }

  private readonly annotations: Annotation[] = [];
  getAnnotations(): Annotation[] {
    return this.annotations;
  }

  public run(extension: FormState): void {
    for (const fieldName of urlPatternFields) {
      this.analyzeUrlPatterns(extension, fieldName);
    }

    for (const fieldName of stringUrlFields) {
      this.analyzeStringUrls(extension, fieldName);
    }
  }

  analyzeUrlPatterns(extension: FormState, fieldName: string): void {
    const urlPatterns = get(extension, fieldName);
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
              path: joinPathParts(fieldName, index, key),
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

  analyzeStringUrls(extension: FormState, fieldName: string): void {
    const urls = get(extension, fieldName);
    if (urls == null || urls.length === 0) {
      return;
    }

    for (const [index, url] of Object.entries(urls)) {
      if (isEmpty(url)) {
        this.annotations.push({
          position: {
            path: joinPathParts(fieldName, index),
          },
          message: "This field is required",
          analysisId: this.id,
          type: AnnotationType.Error,
          detail: url,
        });
      }
    }
  }
}

export default ExtensionUrlPatternAnalysis;
