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

import styles from "./AdvancedLinks.module.scss";

import { type BrickCondition, type BrickWindow } from "@/bricks/types";
import { type TemplateEngine } from "@/types/runtimeTypes";
import { useField } from "formik";
import { partial } from "lodash";
import React, { type MutableRefObject } from "react";
import { Button } from "react-bootstrap";
import { isExpression } from "@/utils/expressionUtils";
import { joinName } from "@/utils/formUtils";
import { windowOptions } from "@/pageEditor/tabs/effect/configurationConstants";
import { getConstantConditionOrUndefined } from "@/runtime/runtimeUtils";

export const DEFAULT_TEMPLATE_ENGINE_VALUE: TemplateEngine = "mustache";

export const DEFAULT_WINDOW_VALUE: BrickWindow = "self";

type AdvancedLinksProps = {
  name: string;
  scrollToRef: MutableRefObject<HTMLElement | null>;
};

const ConditionPreview: React.FunctionComponent<{
  condition: BrickCondition;
}> = ({ condition }) => {
  const constantCondition = getConstantConditionOrUndefined(condition);

  if (constantCondition == null) {
    const value = isExpression(condition) ? condition.__value__ : condition;
    return <span>{value}</span>;
  }

  if (constantCondition) {
    return (
      <span>
        <em>Always</em>
      </span>
    );
  }

  return (
    <span>
      <em>Never</em>
    </span>
  );
};

/**
 * Links to the Advanced Configuration section. Used to indicate if any advanced settings that impact brick
 * runtime behavior are set.
 */
const AdvancedLinks: React.FC<AdvancedLinksProps> = ({ name, scrollToRef }) => {
  const configName = partial(joinName, name);

  const [{ value: templateEngineValue }] = useField<TemplateEngine>(
    configName("templateEngine"),
  );
  const [{ value: ifFieldValue }] = useField<BrickCondition>(configName("if"));
  const [{ value: windowValue }] = useField<BrickWindow>(configName("window"));

  const customTemplateEngineSet =
    templateEngineValue &&
    templateEngineValue !== DEFAULT_TEMPLATE_ENGINE_VALUE;

  const isConditionSet = ifFieldValue != null;

  const customWindowSet = windowValue && windowValue !== DEFAULT_WINDOW_VALUE;

  const advancedOptionsSet =
    customTemplateEngineSet || isConditionSet || customWindowSet;

  if (!advancedOptionsSet) {
    return null;
  }

  const scrollToAdvancedOptions = () => {
    scrollToRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.advancedLinks}>
      {customTemplateEngineSet && (
        <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
          Template Engine: {templateEngineValue}
        </Button>
      )}
      {isConditionSet && (
        <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
          Condition: <ConditionPreview condition={ifFieldValue} />
        </Button>
      )}
      {customWindowSet && (
        <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
          Target:{" "}
          {windowOptions.find((x) => x.value === windowValue)?.label ??
            windowValue}
        </Button>
      )}
    </div>
  );
};

export default AdvancedLinks;
