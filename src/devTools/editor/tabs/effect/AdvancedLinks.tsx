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

import styles from "./AdvancedLinks.module.scss";

import { BlockIf, BlockWindow } from "@/blocks/types";
import { TemplateEngine } from "@/core";
import { joinName } from "@/utils";
import { useField } from "formik";
import { partial } from "lodash";
import React, { MutableRefObject } from "react";
import { Button } from "react-bootstrap";
import { isExpression } from "@/runtime/mapArgs";

export const DEFAULT_TEMPLATE_ENGINE_VALUE: TemplateEngine = "mustache";
export const DEFAULT_WINDOW_VALUE: BlockWindow = "self";

type AdvancedLinksProps = {
  name: string;
  scrollToRef: MutableRefObject<HTMLElement>;
};

const AdvancedLinks: React.FC<AdvancedLinksProps> = ({ name, scrollToRef }) => {
  const configName = partial(joinName, name);

  const [{ value: templateEngineValue }] = useField<TemplateEngine>(
    configName("templateEngine")
  );
  const [{ value: ifFieldValue }] = useField<BlockIf>(configName("if"));
  const [{ value: windowValue }] = useField<BlockWindow>(configName("window"));

  const customTemplateEngineSet =
    templateEngineValue &&
    templateEngineValue !== DEFAULT_TEMPLATE_ENGINE_VALUE;

  const ifValue = isExpression(ifFieldValue)
    ? ifFieldValue.__value__
    : ifFieldValue;

  const customWindowSet = windowValue && windowValue !== DEFAULT_WINDOW_VALUE;

  const advancedOptionsSet =
    customTemplateEngineSet || ifValue || customWindowSet;

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
      {ifValue && (
        <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
          Condition: {ifValue}
        </Button>
      )}
      {customWindowSet && (
        <Button variant="link" size="sm" onClick={scrollToAdvancedOptions}>
          Target: {windowValue}
        </Button>
      )}
    </div>
  );
};

export default AdvancedLinks;
