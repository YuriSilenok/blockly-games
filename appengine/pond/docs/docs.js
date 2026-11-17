/**
 * @license
 * Copyright 2014 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview JavaScript for Pond Documentation.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * Turn all h2 tags into zippies.  Called on page load.
 */
function init() {
  filterDocumentation();
  PondRussian.images(document);
  PondRussian.explanations(document);
  var headers = document.getElementsByTagName('h2');
  for (var i = 0, header; (header = headers[i]); i++) {
    var img = document.createElement('img');
    img.src = '../common/1x1.gif';
    header.insertBefore(img, header.firstChild);
    header.classList.add('zippy-header-collapsed');
    var content = document.getElementById(header.id + '-content');
    content.classList.add('zippy-content-collapsed');
    bindClick(header, toggle);
  }
  document.body.classList.remove('docs-loading');
}

/** Use the current toolbox, including dynamic variable blocks, as the source. */
function filterDocumentation() {
  var toolbox;
  try {
    toolbox = window.parent !== window ? window.parent.document.getElementById('toolbox') : null;
  } catch (error) {
    return;
  }
  // A standalone reference has no player toolbox to restrict it to.
  if (!toolbox) return;
  var available = new Set();
  toolbox.querySelectorAll('block[type], shadow[type]').forEach(function (block) {
    available.add(block.getAttribute('type'));
  });
  if (toolbox.querySelector('category[custom="VARIABLE"]')) {
    ['variables_set', 'variables_get', 'math_change'].forEach(function (type) {
      available.add(type);
    });
  }
  Array.from(document.querySelectorAll('h2')).forEach(function (header) {
    var content = document.getElementById(header.id + '-content');
    var headings = Array.from(content.querySelectorAll('h3'));
    var visible = document.createDocumentFragment();
    headings.forEach(function (heading, index) {
      var types = (heading.getAttribute('data-blocks') || '').split(/\s+/);
      if (!types.some(function (type) { return available.has(type); })) return;
      var range = document.createRange();
      range.setStartBefore(heading);
      if (headings[index + 1]) range.setEndBefore(headings[index + 1]);
      else range.setEnd(content, content.childNodes.length);
      visible.appendChild(range.cloneContents());
    });
    if (visible.hasChildNodes()) content.replaceChildren(visible);
    else { header.remove(); content.remove(); }
  });
}

/**
 * Bind a function to a button's click event.
 * On touch-enabled browsers, ontouchend is treated as equivalent to onclick.
 * @param {Element} el Button element.
 * @param {!Function} func Event handler to bind.
 */
function bindClick(el, func) {
  el.addEventListener('click', func, true);
  function touchFunc(e) {
    // Prevent code from being executed twice on touchscreens.
    e.preventDefault();
    func(e);
  }
  el.addEventListener('touchend', touchFunc, true);
}

/**
 * Toggle one section open or closed.
 * @param {!Event} e The click or touch event.
 */
function toggle(e) {
  var header = e.currentTarget;
  var content = document.getElementById(header.id + '-content');
  var isOpen = content.classList.contains('zippy-content-expanded');
  header.classList.add(
      'zippy-header-' + (isOpen ? 'collapsed' : 'expanded'));
  content.classList.add(
      'zippy-content-' + (isOpen ? 'collapsed' : 'expanded'));
  header.classList.remove(
      'zippy-header-' + (isOpen ? 'expanded' : 'collapsed'));
  content.classList.remove(
      'zippy-content-' + (isOpen ? 'expanded' : 'collapsed'));
  content.style.maxHeight = isOpen ? 0 : (content.scrollHeight + 'px');
}

(function() {
  window.addEventListener('load', init);
  document.body.classList.add('hideJs', 'docs-loading');
})();
