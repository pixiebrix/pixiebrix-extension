# PixieBrix Browser Extension

[PixieBrix](https://www.pixiebrix.com/) is a platform for safely extending websites and
SaaS applications with low/no-code.

## Key Concepts

### Domain Entities

* **Extension Points:** points where users can attach functionality. Current support: information panels,
menu items/buttons.
* **Blocks:** blocks are functions that you can write together and attach to an extension point. You can also create
composite blocks by combining them into a single unit.
    * **Readers:** read information from a document. Current Support: HTML via JQuery, EmberJS, React,
    window variables. Each Extension Point has a default reader it provides.
    * **Effects:** take an input and perform a side effect. Examples: append a row to spreadsheet,
    send a message to Slack, open a new tab with a Google search.
    * **Transforms:** take an input and produce an output. Example: call an API,
    run a [jq transform](https://github.com/stedolan/jq), extract data with a regular expression
    * **Renderers:** a transform that returns HTML, e.g., to render in a panel extension point. Examples:
    renderer markdown, a data table.
* **Services:** re-usable resources and configuration that can also be used to authenticate
requests to APIs. By creating a [PixieBrix](https://www.pixiebrix.com/) account, you can
share service configurations with your team. Examples: an API credential, a Google Sheet.
* **Recipes:** collections of extension point + block combinations that a user can install
together. Example: Hubspot actions and panels for LinkedIn

### Data Flow

PixieBrix supports acyclic data flow between named inputs/outputs. By default, data flows
from one block to the next. However, a block may instead store its outputs to a variable
that subsequent blocks can then reference.

To attach a block to an extension point, you wire the output of the Extension Point's default Reader
to the block. To define a composite block, you define an input schema, and wire the inputs to the
component blocks.

To facilitate wiring, PixieBrix currently supports the following:
* Object paths with [optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
* [Mustache](https://mustache.github.io/)
* [Nunjucks](https://mozilla.github.io/nunjucks/) (similar to Jinja2)

### Input/Output Specifications

PixieBrix uses [JSON Schema](http://json-schema.org/) for specifying the shapes of inputs and outputs.
In addition to serving as documentation, this helps to detect which blocks are misbehaving.

## Why not _X_?

We're avid users of Browser Extensions and Userscripts, and they'll always have their place. We're building
PixieBrix to bring their power to a broader audience.

**Why not Browser Extensions?**

* **Development Learning Curve:** creating a browser extension to extend a SaaS application has a steep learning curve:
JS build systems, the extension API, messaging between contexts, SaaS page lifecycle. With PixieBrix, you just
need to know programming basics, e.g., variables, CSS selectors, regular expressions. Our goal is go even further
to allow anyone to extend their applications.
* **Publishing Speed:** extension stores have slow and unpredictable review times (between 1-7 days). With PixieBrix,
you can publish updates immediately.
* **Security:** most browser extensions are closed-source. Despite web store security reviews, there have been
high profile cases of bad actors buying popular extensions and repurposing the extension to steal private
data. With PixieBrix, the extension and all the bricks you install are open-source.

**Why not Userscripts?**

* **Development Learning Curve:** while better than Browser Extensions, developing Userscripts that integrate with modern
SaaS applications has a steep learning curve.
* **Security:** userscripts are just Javascript, and therefore can perform arbitrary behaviors including stealing your
private data.
* **Availability:** Chrome is moving to [eliminate remote code in browser extensions](https://developer.chrome.com/extensions/migrating_to_manifest_v3#api_checklist).
This will prohibit userscript managers from the Chrome Web Store.
