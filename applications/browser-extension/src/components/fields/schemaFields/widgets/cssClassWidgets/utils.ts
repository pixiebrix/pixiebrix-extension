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

import { compact, partition, uniq } from "lodash";
import { type Expression, type TemplateEngine } from "../../../../../types/runtimeTypes";
import {
  isTemplateExpression,
  isVarExpression,
  toExpression,
} from "../../../../../utils/expressionUtils";
import {
  type ClassFlag,
  type Value,
  type Spacing,
} from "./types";

/**
 * Return utility classes from the value
 */
export function parseValue(value: Value): {
  classes: string[];
  isVar: boolean;
  isTemplate: boolean;
  includesTemplate: boolean;
} {
  if (value == null) {
    return {
      classes: [],
      isVar: false,
      isTemplate: false,
      includesTemplate: false,
    };
  }

  if (isVarExpression(value)) {
    return {
      classes: [],
      isVar: true,
      isTemplate: false,
      includesTemplate: false,
    };
  }

  if (isTemplateExpression(value)) {
    return {
      classes: value.__value__.split(" "),
      isVar: false,
      isTemplate: true,
      includesTemplate:
        value.__value__.includes("{{") || value.__value__.includes("{%"),
    };
  }

  if (typeof value === "string") {
    return {
      classes: value.split(" "),
      isVar: false,
      isTemplate: false,
      includesTemplate: false,
    };
  }

  throw new Error(
    `Unexpected value parsing the CSS class. Type of value: ${typeof value}. Value: ${JSON.stringify(
      value,
    )}`,
  );
}

function createSpacingRegex(prefix: string): RegExp {
  return new RegExp(`^${prefix}(?<side>[trbl]?)-(?<negative>n?)(?<size>\\d+)$`);
}

export function extractSpacing(prefix: string, classes: string[]): Spacing[] {
  const re = createSpacingRegex(prefix);

  return classes
    .map((element) => re.exec(element))
    .filter(Boolean)
    .map(({ groups }) => ({
      side: groups?.side || null,
      size:
        groups?.negative === "n" ? -Number(groups?.size) : Number(groups?.size),
    }));
}

export function calculateNextSpacing(
  previousValue: Value,
  prefix: string,
  spacingUpdate: Spacing,
): Value {
  const { isVar, isTemplate, classes, includesTemplate } =
    parseValue(previousValue);

  if (isVar || includesTemplate) {
    throw new Error("Not supported");
  }

  const regex = createSpacingRegex(prefix);

  const [spacingClasses, otherClasses] = partition(classes, (x) =>
    regex.test(x),
  );
  const spacingRules = extractSpacing(prefix, spacingClasses);
  // Select onClear sets the size as null
  if (spacingUpdate.size == null) {
    // Remove spacingRules with same side as spacingUpdate
    spacingRules.splice(
      spacingRules.findIndex((x) => x.side === spacingUpdate.side),
      1,
    );
  } else {
    // Don't try to be smart for now. Just update the rule
    const existingRule = spacingRules.find(
      (x) => x.side === spacingUpdate.side,
    );
    if (existingRule) {
      existingRule.size = spacingUpdate.size;
    } else {
      spacingRules.push(spacingUpdate);
    }
  }

  const nextClasses = [
    ...otherClasses,
    ...spacingRules
      // We filter rules so that we don't have both generic and side-specific rules
      .filter((rule) =>
        spacingUpdate.side == null ? rule.side == null : rule.side != null,
      )
      .map(({ side, size = 0 }: { side: string; size: number }) => {
        side ??= "";
        size ??= 0;

        return `${prefix}${side}-${size < 0 ? "n" : ""}${Math.abs(size)}`;
      }),
  ];

  const nextValue = compact(uniq(nextClasses)).join(" ");

  if (isTemplate) {
    // eslint-disable-next-line local-rules/noExpressionLiterals -- not enough type information
    return {
      __type__: (previousValue as Expression).__type__,
      __value__: nextValue,
    };
  }

  return nextValue;
}

export function calculateNextValue(
  previousValue: Value,
  className: string,
  on: boolean,
  group?: ClassFlag[],
): Value {
  const { isVar, isTemplate, classes, includesTemplate } =
    parseValue(previousValue);

  if (isVar || includesTemplate) {
    throw new Error("Not supported");
  }

  let nextClasses;

  if (on && group) {
    const rule = group.find((x) => x.className === className);

    if (rule == null) {
      throw new Error(`Class ${className} not found in group`);
    }

    const isExclusive = rule.exclusive ?? true;
    const implies = rule.implies ?? [];

    const inactiveClasses = group
      .map((x) => x.className)
      .filter((x) => x !== className);

    nextClasses = [
      ...classes.filter(
        (x) =>
          (!isExclusive || !inactiveClasses.includes(x)) &&
          !implies.includes(x),
      ),
      className,
    ];
  } else if (on) {
    nextClasses = [...classes, className];
  } else {
    nextClasses = classes.filter((x) => x !== className);
  }

  const nextValue = compact(uniq(nextClasses)).join(" ");

  if (isTemplate) {
    return toExpression(
      (previousValue as Expression).__type__ as TemplateEngine,
      nextValue,
    );
  }

  return nextValue;
}
