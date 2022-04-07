// Copyright (c) 2015-2016 Adam Pietrasiak
// https://github.com/pie6k/jquery.initialize/blob/master/jquery.initialize.js
// Changes:
// - expose as a module instead of JQuery plugin
// - check if Element type is defined
// - use $safeFind to catch invalid selectors #3061

import { $safeFind } from "@/helpers";

var combinators = [" ", ">", "+", "~"]; // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors#Combinators
var fraternisers = ["+", "~"]; // These combinators involve siblings.
var complexTypes = ["ATTR", "PSEUDO", "ID", "CLASS"]; // These selectors are based upon attributes.

// Check if browser supports "matches" function
if (typeof Element !== "undefined" && !Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.matchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector;
}

// Understand what kind of selector the initializer is based upon.
function grok(msobserver) {
  if (!$.find.tokenize) {
    // This is an old version of jQuery, so cannot parse the selector.
    // Therefore we must assume the worst case scenario. That is, that
    // this is a complicated selector. This feature was available in:
    // https://github.com/jquery/sizzle/issues/242
    msobserver.isCombinatorial = true;
    msobserver.isFraternal = true;
    msobserver.isComplex = true;
    return;
  }

  // Parse the selector.
  msobserver.isCombinatorial = false;
  msobserver.isFraternal = false;
  msobserver.isComplex = false;
  var token = $.find.tokenize(msobserver.selector);
  for (var i = 0; i < token.length; i++) {
    for (var j = 0; j < token[i].length; j++) {
      if (combinators.indexOf(token[i][j].type) != -1)
        msobserver.isCombinatorial = true; // This selector uses combinators.

      if (fraternisers.indexOf(token[i][j].type) != -1)
        msobserver.isFraternal = true; // This selector uses sibling combinators.

      if (complexTypes.indexOf(token[i][j].type) != -1)
        msobserver.isComplex = true; // This selector is based on attributes.
    }
  }
}

// MutationSelectorObserver represents a selector and it's associated initialization callback.
var MutationSelectorObserver = function (selector, callback, options) {
  this.selector = selector.trim();
  this.callback = callback;
  this.options = options;

  grok(this);
};

// List of MutationSelectorObservers.
var msobservers = [];
msobservers.initialize = function (selector, callback, options) {
  // Wrap the callback so that we can ensure that it is only
  // called once per element.
  var seen = [];
  var callbackOnce = function () {
    if (seen.indexOf(this) == -1) {
      seen.push(this);
      $(this).each(callback);
    }
  };

  // See if the selector matches any elements already on the page.
  $safeFind(selector, options.target).each(callbackOnce);

  // Then, add it to the list of selector observers.
  var msobserver = new MutationSelectorObserver(
    selector,
    callbackOnce,
    options
  );
  this.push(msobserver);

  var isMatchinInProgress = false;
  // The MutationObserver watches for when new elements are added to the DOM.
  var observer = new MutationObserver(function (mutations) {
    // Avoid loop caused by Sizzle changing attributes while querying
    // https://github.com/pie6k/jquery.initialize/issues/29
    // https://github.com/jquery/sizzle/blob/20390f05731af380833b5aa805db97de0b91268a/src/sizzle.js#L344
    if (isMatchinInProgress) {
      return;
    }

    isMatchinInProgress = true;

    var matches = [];

    // For each mutation.
    for (var m = 0; m < mutations.length; m++) {
      // If this is an attributes mutation, then the target is the node upon which the mutation occurred.
      if (mutations[m].type == "attributes") {
        // Check if the mutated node matchs.
        if ($(mutations[m].target).is(msobserver.selector))
          matches.push(mutations[m].target);

        // If the selector is fraternal, query siblings of the mutated node for matches.
        if (msobserver.isFraternal)
          matches.push.apply(
            matches,
            $safeFind(msobserver.selector, mutations[m].target.parentElement)
          );
        else
          matches.push.apply(
            matches,
            $safeFind(msobserver.selector, mutations[m].target)
          );
      }

      // If this is an childList mutation, then inspect added nodes.
      if (mutations[m].type == "childList") {
        // Search added nodes for matching selectors.
        for (var n = 0; n < mutations[m].addedNodes.length; n++) {
          if (!(mutations[m].addedNodes[n] instanceof Element)) continue;

          // Check if the added node matches the selector
          if ($(mutations[m].addedNodes[n]).is(msobserver.selector))
            matches.push(mutations[m].addedNodes[n]);

          // If the selector is fraternal, query siblings for matches.
          if (msobserver.isFraternal)
            matches.push.apply(
              matches,
              $safeFind(
                msobserver.selector,
                mutations[m].addedNodes[n].parentElement
              )
            );
          else
            matches.push.apply(
              matches,
              $safeFind(msobserver.selector, mutations[m].addedNodes[n])
            );
        }
      }
    }

    // For each match, call the callback using jQuery.each() to initialize the element (once only.)
    for (var i = 0; i < matches.length; i++)
      $(matches[i]).each(msobserver.callback);

    isMatchinInProgress = false;
  });

  // Observe the target element.
  var defaultObeserverOpts = {
    childList: true,
    subtree: true,
    attributes: msobserver.isComplex,
  };
  observer.observe(options.target, options.observer || defaultObeserverOpts);

  return observer;
};

export default function (selector, callback, options) {
  return msobservers.initialize(selector, callback, $.extend({}, options));
}
