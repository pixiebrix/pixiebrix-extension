import React from "react"
import Component, {type TemplateTextWidgetProps} from "./TemplateTextWidget";


export default {
    title: "Widgets/TemplateTextWidget",
    component: Component,
    argTypes: {
        variant: {
          // Todo: update when we add new variants
          options: ["highlight"],
          control: { type: "radio" },
        },
      },
}

export const TemplateTextWidget = (args: TemplateTextWidgetProps) => <div><Component {...args} /></div>

TemplateTextWidget.args = {
 variant: "highlight",
 value: "Lorem ipsum {{ @dolor sit amet }}, consectetur adipiscing elit. {{ Maecenas euismod }} viverra {% lectus %}, eu {% @fermentum @sapien %} sapien rhoncus in. Duis eget eleifend est. Aliquam sit amet felis magna."
}