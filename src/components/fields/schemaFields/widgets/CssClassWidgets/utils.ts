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

import { compact, partition, uniq } from "lodash";
import { type Expression, type TemplateEngine } from "@/types/runtimeTypes";
import { isTemplateExpression, isVarExpression } from "@/utils/expressionUtils";

export type Spacing = {
  side: string | null;
  size: number;
};

export type Value = string | Expression;

/**
 * An independent class name
 */
type ClassFlag = {
  /**
   * The Bootstrap 4 class name
   */
  className: string;

  /**
   * Title node to render for the element (in a button/dropdown)
   */
  title: React.ReactNode;

  /**
   * True if the flag is exclusive for it's group (default=true)
   */
  exclusive?: boolean;

  /**
   * Other flags in the same group that the flag implies
   */
  implies?: string[];
};

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
    if (value.__value__.includes("{{") || value.__value__.includes("{%")) {
      return {
        classes: value.__value__.split(" "),
        isVar: false,
        isTemplate: true,
        includesTemplate: true,
      };
    }

    return {
      classes: value.__value__.split(" "),
      isVar: false,
      isTemplate: true,
      includesTemplate: false,
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

  throw new Error("Unexpected value");
}

function createSpacingRegex(prefix: string): RegExp {
  return new RegExp(`${prefix}(?<side>[tblrxy])?-?(?<size>-?\\d)`);
}

export function extractSpacing(prefix: string, classes: string[]): Spacing[] {
  const re = createSpacingRegex(prefix);

  return compact(classes.map((x) => re.exec(x))).map((x) => ({
    side: x.groups.side ?? null,
    size: Number(x.groups.size),
  })) as Spacing[];
}

export function calculateNextSpacing(
  previousValue: Value,
  prefix: string,
  spacingUpdate: Spacing
): Value {
  const { isVar, isTemplate, classes, includesTemplate } =
    parseValue(previousValue);

  if (isVar || includesTemplate) {
    throw new Error("Not supported");
  }

  const regex = createSpacingRegex(prefix);

  const [spacingClasses, otherClasses] = partition(classes, (x) =>
    regex.test(x)
  );
  const spacingRules = extractSpacing(prefix, spacingClasses);

  // Don't try to be smart for now. Just update the rule
  const existingRule = spacingRules.find((x) => x.side === spacingUpdate.side);
  if (existingRule) {
    existingRule.size = spacingUpdate.size;
  } else {
    spacingRules.push(spacingUpdate);
  }
  // // Select onClear sets the size as null
  // if(spacingUpdate.size == null) {
  //   // Remove the rule
  //   spacingRules.filter((rule) => rule.side !== spacingUpdate.side);
  // } else {
  //
  // }

  const nextClasses = [
    ...otherClasses,
    ...spacingRules
      // We filter rules so that we don't have both generic and side-specific rules
      .filter((rule) =>
        spacingUpdate.side == null ? rule.side == null : rule.side != null
      )
      .map((x) => `${prefix}${x.side ?? ""}-${x.size}`),
  ];

  const nextValue = compact(uniq(nextClasses)).join(" ");

  if (isTemplate) {
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
  group?: ClassFlag[]
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
          (!isExclusive || !inactiveClasses.includes(x)) && !implies.includes(x)
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
    return {
      __type__: (previousValue as Expression).__type__ as TemplateEngine,
      __value__: nextValue,
    };
  }

  return nextValue;
}
