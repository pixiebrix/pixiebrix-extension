import React from "react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { render } from "@/pageEditor/testHelpers";

import TemplateTextWidget, { findRegexIndexes, nunjuckTextHighlighter, templateRegex, variableRegex } from "./TemplateTextWidget";

const fieldName = "testField";

describe("TextWidget", () => {
  beforeAll(() => {
    registerDefaultWidgets();
  });

  test("renders empty widget", async () => {

    expect(
      render(
        <TemplateTextWidget value=""  />,
        {
          initialValues: {
            [fieldName]: "",
          },
        }
      ).asFragment()
    ).toMatchSnapshot();
  });
});

describe("TextWidget utilities", () => {

  const templateString1 = "some text {{ template }} more text {{ another template }}"
  const templateString2 = "some text {% template %} more text {% another template %}"
  const variableString = "some {{ @text @template }} more text {% @another @template %}"

  test("regex curly string returns correct positions", () =>{
    expect(findRegexIndexes(templateString1, templateRegex)).toStrictEqual([[10, 24], [35, 57]])
  });

  test("regex mod string returns correct positions with offset", () =>{
    expect(findRegexIndexes(templateString2, templateRegex, 2)).toStrictEqual([[12, 26], [37, 59]])
  });

  test("regex variables return correct positions", () =>{
    expect(findRegexIndexes(variableString, variableRegex)).toStrictEqual([[8, 13], [14, 23], [40, 48], [49, 58]])
  });

  test("nunjuckTextHighlighter", () => {
    expect(nunjuckTextHighlighter([{text: templateString1}, [0,0]])).toStrictEqual(
      [
           {
             "anchor": {
               "offset": 10,
               "path": [
                 0,
                 0,
               ],
             },
             "focus": {
               "offset": 24,
               "path": [
                 0,
                 0,
               ],
             },
             "template": true,
           },
           {
             "anchor": {
               "offset": 35,
               "path": [
                 0,
                 0,
               ],
             },
             "focus": {
               "offset": 57,
               "path": [
                 0,
                 0,
               ],
             },
             "template": true,
           },
         ]

    )
  })
})
