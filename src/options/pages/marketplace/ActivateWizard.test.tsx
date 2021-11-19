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
import React from "react";
import { RecipeDefinition } from "@/types/definitions";
import { render, screen } from "@testing-library/react";
import OptionsBody from "@/options/pages/marketplace/OptionsBody";
import { Form, Formik } from "formik";

jest.mock("react-redux", () => ({
  useSelector: () => {
    return [
      {
        id: "3f38fc92-2f01-4b48-ad96-0856a2cde475",
        apiVersion: "v2",
        _recipe: {
          id: "@pixies/slack/send-selected-to-slack",
          version: "1.0.6",
          name: "Send selected to Slack",
          description: "Blueprint exported from PixieBrix",
          sharing: {
            public: false,
            organizations: ["0557cdab-7246-4a73-a644-12a2249f02b9"],
          },
        },
        definitions: {},
        optionsArgs: {
          channels: "#misha",
        },
        services: [
          {
            outputKey: "slack",
            config: "51a0dfde-1811-4efe-bfc3-949229095613",
            id: "slack/incoming-webhook",
          },
        ],
        label: "Send selected to Slack",
        extensionPointId: "@pixiebrix/context-search",
        config: {
          title: "Send selected to Slack",
          action: [
            {
              id: "@pixiebrix/jq",
              config: {
                data: "@options.channels",
                filter: 'sub(" ";"") | split(",")\n',
              },
              outputKey: "channelArray",
            },
            {
              id: "@pixiebrix/form-modal",
              config: {
                schema: {
                  type: "object",
                  title: "Choose channel",
                  required: ["channel"],
                  properties: {
                    notes: {
                      type: "string",
                      title: "Notes",
                      default: "",
                      description: "Text to add before message",
                    },
                    channel: {
                      enum: "@channelArray",
                      type: "string",
                      title: "Channel",
                    },
                  },
                },
                uiSchema: {
                  Channel: {
                    "ui:widget": "select",
                  },
                  "ui:order": ["channel", "notes", "*"],
                },
                cancelable: true,
                submitCaption: "Submit",
              },
              outputKey: "form",
            },
            {
              id: "slack/advanced-message",
              config: {
                channel: "{{{@form.channel}}}",
                hookUrl: "{{{@slack.hookUrl}}}",
                attachments: [
                  {
                    text: "@input.selectionText",
                    pretext: "{{{@form.notes}}} {{{@input.pageUrl}}}",
                    fallback: "{{{@form.notes}}} {{{@input.selectionText}}}",
                  },
                ],
              },
            },
          ],
        },
        active: true,
        createTimestamp: "2021-11-19T20:39:18.111Z",
        updateTimestamp: "2021-11-19T20:39:18.111Z",
      },
    ];
  },
}));

const blueprint: RecipeDefinition = {
  kind: "recipe",
  options: {
    schema: {
      channels: {
        type: "string",
        outputKey: "channels",
        description:
          "Comma-separated list of channels (e.g., #sales,#marketing)",
      },
    },
  },
  metadata: {
    id: "@pixies/slack/send-selected-to-slack",
    name: "Send selected to Slack",
    version: "1.0.6",
    description: "Blueprint exported from PixieBrix",
  },
  apiVersion: "v2",
  extensionPoints: [
    {
      id: "@pixiebrix/context-search",
      label: "Send selected to Slack",
      config: {
        title: "Send selected to Slack",
        action: [
          {
            id: "@pixiebrix/jq",
            config: {
              data: "@options.channels",
              filter: 'sub(" ";"") | split(",")\n',
            },
            outputKey: "channelArray",
          },
          {
            id: "@pixiebrix/form-modal",
            config: {
              schema: {
                type: "object",
                title: "Choose channel",
                required: ["channel"],
                properties: {
                  notes: {
                    type: "string",
                    title: "Notes",
                    default: "",
                    description: "Text to add before message",
                  },
                  channel: {
                    enum: "@channelArray",
                    type: "string",
                    title: "Channel",
                  },
                },
              },
              uiSchema: {
                Channel: {
                  "ui:widget": "select",
                },
                "ui:order": ["channel", "notes", "*"],
              },
              cancelable: true,
              submitCaption: "Submit",
            },
            outputKey: "form",
          },
          {
            id: "slack/advanced-message",
            config: {
              channel: "{{{@form.channel}}}",
              hookUrl: "{{{@slack.hookUrl}}}",
              attachments: [
                {
                  text: "@input.selectionText",
                  pretext: "{{{@form.notes}}} {{{@input.pageUrl}}}",
                  fallback: "{{{@form.notes}}} {{{@input.selectionText}}}",
                },
              ],
            },
          },
        ],
      },
      services: {
        slack: "slack/incoming-webhook",
      },
    },
  ],
  sharing: {
    public: false,
    organizations: ["0557cdab-7246-4a73-a644-12a2249f02b9"],
  },
};

describe("ActivationWizard reinstall", () => {
  // test("prefills existing configurations", () => {
  //   render(
  //     <ConfigureBody blueprint={blueprint} reinstall={true}/>
  //   );
  // });

  test("prefills existing options", () => {
    render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        <Form id="activate-wizard" noValidate onSubmit={jest.fn()}>
          <OptionsBody blueprint={blueprint} reinstall={true} />
        </Form>
      </Formik>
    );

    const reactivateOption = screen.getByText("doesn't exist");
  });

  // test("prefills existing services")
});
