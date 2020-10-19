# PixieBrix Browser Extension

PixieBrix is a platform for safely extending your favorite websites and SaaS applications
with low/no-code.

This repository is for our open-source browser extension. Currently, it only supports
Chrome. We'll be adding support for Firefox, Edge, et al. soon.

In addition to the extension, we maintain [pixiebrix.com](https://www.pixiebrix.com/), a
registry of bricks and pre-made blueprints. You can create a PixieBrix account to enable
support for team features, such as shared service configurations and team bricks.

## Example Uses

Whenever you notice yourself switching back and forth between browser tabs, it's
a great time to use PixieBrix:

* Add a button to Apartments.com to send your favorite apartment listings to a Google sheet
* Show Google Scholar results on a person's LinkedIn profile
* Embed a [YouTube video](https://www.youtube.com/watch?v=dQw4w9WgXcQ) in your
employee training site

## Key Concepts

### Kinds of Bricks

The PixieBrix ecosystem is composed of combinable components that we call "bricks":

* **Foundations (aka Extension Points):** points where users can attach functionality. Current support: information panels,
menu items/buttons.
* **Blocks:** blocks are functions that you can wire together and attach to an extension point. You can also create
composite blocks that behave as a single brick.
    * **Readers:** read information from a document. Current Support: HTML via JQuery, EmberJS, React,
    window variables. Each Extension Point has a default reader it provides.
    * **Effects:** take an input and perform a side effect. Examples: append a row to spreadsheet,
    send a message to Slack, open a new tab with a Google search.
    * **Transforms:** take an input and produce an output. Example: call an API,
    run a [jq transform](https://github.com/stedolan/jq), extract data using a regular expression
    * **Renderers:** a transform that returns HTML, e.g., to render in a panel extension point. Examples:
    renderer markdown, a data table.
* **Services:** re-usable resources and configuration that can also be used to authenticate
requests to APIs. By creating a [PixieBrix](https://www.pixiebrix.com/) account, you can
share service configurations with your team. Examples: an API credential, a Google Sheet.
* **Blueprints (aka Recipes):** collections of extension point + block combinations that a user can install
together. Example: Hubspot actions and panels for LinkedIn

### Data Flow

PixieBrix supports acyclic data flow between named inputs/outputs. By default, data flows
from one block to the next. However, a block may instead store its outputs to a variable
that subsequent blocks can then reference.

To attach a block to an extension point, you wire the output of the Extension Point's default Reader
to the block. To define a composite block, you define an input schema, and wire the inputs to the
component blocks.

PixieBrix currently supports the following approaches to wiring inputs:
* Object paths with [optional chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
* [Mustache templates](https://mustache.github.io/)
* [Nunjucks templates](https://mozilla.github.io/nunjucks/) (similar to Jinja2)

### Input/Output Schemas

PixieBrix uses [JSON Schema](http://json-schema.org/) for specifying the shapes of inputs and outputs.
In addition to serving as documentation, having a schema facilitates detecting which bricks are
misbehaving.

## Why not _X_?

We're avid users of browser extensions, bookmarklets, and userscripts. They'll always each have their place.
We're building PixieBrix to bring their power to a broader audience. See our Wiki for [a full comparison](https://github.com/pixiebrix/pixiebrix-extension/wiki/Why-not-X%3F)
