/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HTML for Pond tutor.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Pond.Tutor.html');
goog.require('BlocklyGames');
goog.require('BlocklyGames.html');
goog.require('Pond.html');


/**
 * Web page structure.
 * @param {!Object} ij Injected options.
 * @returns {string} HTML.
 */
Pond.Tutor.html.start = function(ij) {
  return `
${BlocklyGames.html.headerBar(ij, BlocklyGames.getMsg('Games.pondTutor', true), '', true, ij.level <= 10, '')}

${Pond.html.visualization()}

${Pond.Tutor.html.toolbox_(ij.level)}
<div id="blockly"></div>

${Pond.Tutor.html.playerTarget_()}
${Pond.Tutor.html.playerPendulum_()}
${Pond.Tutor.html.playerScared_()}
${Pond.Tutor.html.playerDefense_()}

${BlocklyGames.html.dialog()}
${BlocklyGames.html.doneDialog()}
${BlocklyGames.html.storageDialog()}

${Pond.Tutor.html.helpDialogs_(ij.level)}
`;
};


// Пруд

const cannonBlock = `
  <block type="pond_cannon">
    <value name="DEGREE">
      <shadow type="pond_math_number">
        <mutation angle_field="true"></mutation>
        <field name="NUM">0</field>
      </shadow>
    </value>
    <value name="RANGE">
      <shadow type="pond_math_number">
        <mutation angle_field="false"></mutation>
        <field name="NUM">70</field>
      </shadow>
    </value>
  </block>`;

const scanBlock = `
  <block type="pond_scan">
    <value name="DEGREE">
      <shadow type="pond_math_number">
        <mutation angle_field="true"></mutation>
        <field name="NUM">0</field>
      </shadow>
    </value>
  </block>`;

const swimBlock = `
  <block type="pond_swim">
    <value name="DEGREE">
      <shadow type="pond_math_number">
        <mutation angle_field="true"></mutation>
        <field name="NUM">0</field>
      </shadow>
    </value>
  </block>`;

const logBlock = `
  <block type="pond_log">
    <value name="VALUE">
      <shadow type="pond_math_number">
        <mutation angle_field="false"></mutation>
      <field name="NUM">123</field>
      </shadow>
    </value>
  </block>`;

const speedBlock = `<block type="pond_speed"></block>`;
const stopBlock = '<block type="pond_stop"></block>';

// Логика

const ifBlock = `<block type="controls_if"></block>`;

const compareBlock = `<block type="logic_compare"></block>`;

const boolBlook = `<block type="logic_boolean"></block>`

// Математика

const numberBlock = `
  <block type="pond_math_number">
    <mutation angle_field="false"></mutation>
  </block>`;

// Цикл

const whileBlock = `<block type="controls_whileUntil"></block>`;


/**
 * Toolbox.
 * @param {number} level Level 1-10.
 * @returns {string} HTML.
 * @private
*/
Pond.Tutor.html.toolbox_ = function(level) {
  
  const pongCategory = `
    <category name="${BlocklyGames.getMsg('Games.pond', true)}">
      ${cannonBlock}
      ${level >= 2 ? scanBlock : ''}
      ${level >= 4 ? logBlock : ''}
      ${level >= 5 ? swimBlock : ''}
      ${level >= 6 ? stopBlock : ''}
      ${level >= 7 ? speedBlock : ''}
    </category>`;

  const varCategory = `
    <category name="${BlocklyGames.getMsg('Games.catVariables', true)}" custom="VARIABLE">
    </category>`;

  const logicCategory = `
    <category name="${BlocklyGames.getMsg('Games.catLogic', true)}">
      ${level >= 6 ? ifBlock : ''}
      ${level >= 6 ? compareBlock : ''}
      ${level >= 5 ? boolBlook : ''}
    </category>`;

  const matchCatecory = `
    <category name="${BlocklyGames.getMsg('Games.catMath', true)}">
      ${level >= 3 ? numberBlock : ''}
    </category>`;

  const loopCategory = `
    <category name="${BlocklyGames.getMsg('Games.catLoops', true)}">
      ${level >= 5 ? whileBlock : ''}
    </category>`;


  return `<xml id="toolbox" xmlns="https://developers.google.com/blockly/xml">
    ${pongCategory}
    ${level >= 3 ? varCategory : ''}
    ${level >= 3 ? matchCatecory : ''}
    ${level >= 5 ? logicCategory : ''}
    ${level >= 5 ? loopCategory : ''}
  </xml>`;
  


  // const getXYBlocks = level >= 9 ? '<block type="pond_getX"></block><block type="pond_getY"></block>' : '';

};

/**
 * Help dialogs for each level.
 * @param {number} level Level 1-10.
 * @returns {string} HTML.
 * @private
 */
Pond.Tutor.html.helpDialogs_ = function(level) {
  let content = '';
  switch (level) {
    case 1:
      content = `
        ${BlocklyGames.getMsg('Pond.helpText01', true)}
        <br><br>
        <svg height=41 width=250 class="geras-renderer classic-theme">
          <g>
            <path transform="translate(1,1)" fill="#7a4984" d="m 0,8 A 8,8 0 0,1 8,0 H 15 l 6,4 3,0 6,-4 H 40 H 222.36 v 36 H 29.5 l -6,4 -3,0 -6,-4 H 8 a 8,8 0 0,1 -8,-8 z M 125.01,5 h -36.02 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 36.02 z M 193.4,5 h -38.31 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 38.31 z"></path>
            <path fill="#995ba5" d="m 0,8 A 8,8 0 0,1 8,0 H 15 l 6,4 3,0 6,-4 H 40 H 222.36 v 36 H 29.5 l -6,4 -3,0 -6,-4 H 8 a 8,8 0 0,1 -8,-8 z M 125.01,5 h -36.02 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 36.02 z M 193.4,5 h -38.31 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 38.31 z"></path>
            <path class="blocklyPathLight" stroke="#b88cc0" d="m 0.5,7.5 A 7.5,7.5 0 0,1 8,0.5 H 15 l 6,4 3,0 6,-4 H 39.5 M 39.5,0.5 H 221.86 M 2.69,33.3 A 7.5,7.5 0 0,1 0.5,28 V 8 M 125.51,5.5 v 27 h -36.02 M 83.89,24.3 l 3.68,-2.1 M 193.9,5.5 v 27 h -38.31 M 149.99,24.3 l 3.68,-2.1"></path>
            <g transform="translate(89.99,6)">
              <path transform="translate(1,1)" fill="#bdc2db" d="m 0,0 H 34.02 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
              <path fill="#bdc2db" d="m 0,0 H 34.02 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
              <path class="blocklyPathLight" stroke="#8c95c0" style="display: none;" d="m 0.5,0.5 H 33.52 M 33.52,0.5 M 0.5,24.5 V 18.5 m -7.36,-0.5 q -1.52,-5.5 0,-11 m 7.36,1 V 0.5 H 1"></path>
              <g class="blocklyEditableText" transform="translate(10,5)" style="cursor: text;">
                <rect rx="4" ry="4" x="-5" y="0" height="16" width="24.02"></rect>
                <text class="blocklyText" y="12.5">0
                <tspan>°</tspan></text>
              </g>
            </g>
            <g transform="translate(156.09,6)">
              <path transform="translate(1,1)" fill="#bdc2db" d="m 0,0 H 36.31 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
              <path fill="#bdc2db" d="m 0,0 H 36.31 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
              <path class="blocklyPathLight" stroke="#8c95c0" style="display: none;" d="m 0.5,0.5 H 35.81 M 35.81,0.5 M 0.5,24.5 V 18.5 m -7.36,-0.5 q -1.52,-5.5 0,-11 m 7.36,1 V 0.5 H 1"></path>
              <g class="blocklyEditableText" transform="translate(10,5)" style="cursor: text;">
                <rect rx="4" ry="4" x="-5" y="0" height="16" width="26.31"></rect>
                <text class="blocklyText" y="12.5">70</text>
              </g>
            </g>
            <text class="blocklyText" y="12.5" transform="translate(10,10)">cannon</text>
            <text class="blocklyText" y="12.5" transform="translate(68.11,10)">(</text>
            <text class="blocklyText" y="12.5" transform="translate(135.01,10)">,</text>
            <text class="blocklyText" y="12.5" transform="translate(203.4,10)">);</text>
          </g>
        </svg>
      `;
      break;
    case 2:
      content = `
        ${BlocklyGames.getMsg('Pond.helpText02', true)}
        <br><br>
        <svg height="60" width="400" class="geras-renderer classic-theme">
<g class="blocklyDraggable" transform="translate(7,10)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 305.0736541748047  v 5  H 335.0736541748047  V 5  H 335.0736541748047  V 43  H 335.0736541748047  V 43  V 47  h -305.5736541748047  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 44.16893005371094  v -27 z M 163.2197265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 142.89903259277344  v -38 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 305.0736541748047  v 5  H 335.0736541748047  V 5  H 335.0736541748047  V 43  H 335.0736541748047  V 43  V 47  h -305.5736541748047  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 44.16893005371094  v -27 z M 163.2197265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 142.89903259277344  v -38 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 334.5736541748047  H 334.5736541748047  M 0,47  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 8 
 M 133.64671325683594,5.5  v 27  h -44.16893005371094  M 88.977783203125,10  m -5,14.3  l 3.68,-2.1  M 306.61875915527344,5.5  v 38  h -142.89903259277344  M 163.2197265625,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">cannon</text></g><g transform="translate(68.09590148925781,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(143.14671325683594,10)"><text class="blocklyText" x="0" y="13">,</text></g><g transform="translate(316.11875915527344,10)"><text class="blocklyText" x="0" y="13">);</text></g><g transform="translate(81.977783203125,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#bdc2db" d=" m 8,0  h 42.16893005371094  v 5  H 50.16893005371094  V 5  H 50.16893005371094  V 21  H 50.16893005371094  V 21  V 25  h -42.16893005371094  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#bdc2db" d=" m 8,0  h 42.16893005371094  v 5  H 50.16893005371094  V 5  H 50.16893005371094  V 21  H 50.16893005371094  V 21  V 25  h -42.16893005371094  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8c95c0" style="display: none;" d=" m 8,0  m 0.5,0.5  H 49.66893005371094  H 49.66893005371094  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: text;"><rect rx="4" ry="4" x="0" y="0" height="16" width="32.16893005371094" class="blocklyFieldRect"></rect><text class="blocklyText" x="5" y="13">45<tspan>°</tspan></text></g></g><g class="blocklyDraggable" transform="translate(156.2197265625,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 8,0  h 140.89903259277344  v 5  H 148.89903259277344  V 5  H 148.89903259277344  V 32  H 148.89903259277344  V 32  V 36  h -140.89903259277344  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 44.16893005371094  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 8,0  h 140.89903259277344  v 5  H 148.89903259277344  V 5  H 148.89903259277344  V 32  H 148.89903259277344  V 32  V 36  h -140.89903259277344  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 44.16893005371094  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 8,0  m 0.5,0.5  H 148.39903259277344  H 148.39903259277344  M 8.5,35.5  M 8.5,35.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
 M 124.51715087890625,5.5  v 27  h -44.16893005371094  M 79.84822082519531,10  m -5,14.3  l 3.68,-2.1 "></path><g style="display: block;" transform="translate(72.84822082519531,6)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#bdc2db" d=" m 8,0  h 42.16893005371094  v 5  H 50.16893005371094  V 5  H 50.16893005371094  V 21  H 50.16893005371094  V 21  V 25  h -42.16893005371094  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#bdc2db" d=" m 8,0  h 42.16893005371094  v 5  H 50.16893005371094  V 5  H 50.16893005371094  V 21  H 50.16893005371094  V 21  V 25  h -42.16893005371094  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8c95c0" d=" m 8,0  m 0.5,0.5  H 49.66893005371094  H 49.66893005371094  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
" style="display: none;"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: text;"><rect rx="4" ry="4" x="0" y="0" height="16" width="32.16893005371094" class="blocklyFieldRect"></rect><text class="blocklyText" x="5" y="13">45<tspan>°</tspan></text></g></g><g transform="translate(18,10)"><text class="blocklyText" x="0" y="13">scan</text></g><g transform="translate(58.966339111328125,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(134.01715087890625,10)"><text class="blocklyText" x="0" y="13">)</text></g></g></g>
        </svg>
      `;
      break;
    case 3:
      content = `
${BlocklyGames.getMsg('Pond.helpText03', true)}
<br><br>
<svg width="360" height="240" class="geras-renderer classic-theme">
<g class="blocklyDraggable" transform="translate(12,-1)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 151.3428497314453  v 5  H 181.3428497314453  V 5  H 181.3428497314453  V 32  H 181.3428497314453  V 32  V 36  h -151.8428497314453  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 30.153182983398438  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 151.3428497314453  v 5  H 181.3428497314453  V 5  H 181.3428497314453  V 32  H 181.3428497314453  V 32  V 36  h -151.8428497314453  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 30.153182983398438  v -27 z"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 180.8428497314453  H 180.8428497314453  M 0.5,35.5  V 8 
 M 157.76983642578125,5.5  v 27  h -30.153182983398438  M 127.11665344238281,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">var</text></g><g class="blocklyEditableText" transform="translate(35.36505126953125,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g><g transform="translate(102.55545043945312,10)"><text class="blocklyText" x="0" y="13">=</text></g><g transform="translate(167.26983642578125,10)"><text class="blocklyText" x="0" y="13">;</text></g><g class="blocklyDraggable" transform="translate(0,37)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 365.11659240722656  v 5  H 395.11659240722656  V 5  H 395.11659240722656  V 43  H 395.11659240722656  V 43  V 47  h -365.61659240722656  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 365.11659240722656  v 5  H 395.11659240722656  V 5  H 395.11659240722656  V 43  H 395.11659240722656  V 43  V 47  h -365.61659240722656  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 394.61659240722656  H 394.61659240722656  M 0,47  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 0.5 
 M 163.66818237304688,5.5  v 27  h -74.19039916992188  M 88.977783203125,10  m -5,14.3  l 3.68,-2.1  M 366.6616973876953,5.5  v 38  h -172.92050170898438  M 193.24119567871094,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">cannon</text></g><g transform="translate(68.09590148925781,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(173.16818237304688,10)"><text class="blocklyText" x="0" y="13">,</text></g><g transform="translate(376.1616973876953,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(186.24119567871094,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 8,0  m 0.5,0.5  H 178.42050170898438  H 178.42050170898438  M 8.5,35.5  M 8.5,35.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
 M 154.5386199951172,5.5  v 27  h -74.19039916992188  M 79.84822082519531,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(18,10)"><text class="blocklyText" x="0" y="13">scan</text></g><g transform="translate(58.966339111328125,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(164.0386199951172,10)"><text class="blocklyText" x="0" y="13">)</text></g><g class="blocklyDraggable" transform="translate(72.84822082519531,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g><g class="blocklyDraggable" transform="translate(81.977783203125,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g><g class="blocklyDraggable blocklyDraggable" transform="translate(120.11665344238281,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#495284" d=" m 8,0  h 28.153182983398438  v 5  H 36.15318298339844  V 5  H 36.15318298339844  V 21  H 36.15318298339844  V 21  V 25  h -28.153182983398438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#5b67a5" d=" m 8,0  h 28.153182983398438  v 5  H 36.15318298339844  V 5  H 36.15318298339844  V 21  H 36.15318298339844  V 21  V 25  h -28.153182983398438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8c95c0" d=" m 8,0  m 0.5,0.5  H 35.65318298339844  H 35.65318298339844  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: text;"><rect rx="4" ry="4" x="0" y="0" height="16" width="18.153182983398438" class="blocklyFieldRect"></rect><text class="blocklyText" x="5" y="13">0</text></g></g></g>
</svg>
`;
      break;
    case 4:
      content = `
${BlocklyGames.getMsg('Pond.helpText2', true)}
<br><br>
<svg width="360" height="240" class="geras-renderer classic-theme">
<g class="blocklyDraggable" style="display: block;" transform="translate(19,14)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 167.6492156982422  v 5  H 197.6492156982422  V 5  H 197.6492156982422  V 32  H 197.6492156982422  V 32  V 36  h -168.1492156982422  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 46.45954895019531  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 167.6492156982422  v 5  H 197.6492156982422  V 5  H 197.6492156982422  V 32  H 197.6492156982422  V 32  V 36  h -168.1492156982422  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 46.45954895019531  v -27 z"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 197.1492156982422  H 197.1492156982422  M 0.5,35.5  V 8 
 M 174.07620239257812,5.5  v 27  h -46.45954895019531  M 127.11665344238281,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">var</text></g><g class="blocklyEditableText" transform="translate(35.36505126953125,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angel<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g><g transform="translate(102.55545043945312,10)"><text class="blocklyText" x="0" y="13">=</text></g><g transform="translate(183.57620239257812,10)"><text class="blocklyText" x="0" y="13">;</text></g><g class="blocklyDraggable" transform="translate(0,37)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 312.84315490722656  v 5  H 342.84315490722656  V 5  H 342.84315490722656  V 43  H 342.84315490722656  V 43  V 47  h -313.34315490722656  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 145.84963989257812,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 312.84315490722656  v 5  H 342.84315490722656  V 5  H 342.84315490722656  V 43  H 342.84315490722656  V 43  V 47  h -313.34315490722656  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 145.84963989257812,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 342.34315490722656  H 342.34315490722656  M 0.5,46.5  V 0.5 
 M 319.2701416015625,5.5  v 38  h -172.92050170898438  M 145.84963989257812,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">var</text></g><g class="blocklyEditableText" transform="translate(35.36505126953125,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g><g transform="translate(121.28843688964844,10)"><text class="blocklyText" x="0" y="13">=</text></g><g transform="translate(328.7701416015625,10)"><text class="blocklyText" x="0" y="13">;</text></g><g class="blocklyDraggable" transform="translate(138.84963989257812,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 8,0  m 0.5,0.5  H 178.42050170898438  H 178.42050170898438  M 8.5,35.5  M 8.5,35.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
 M 154.5386199951172,5.5  v 27  h -74.19039916992188  M 79.84822082519531,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(18,10)"><text class="blocklyText" x="0" y="13">scan</text></g><g transform="translate(58.966339111328125,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(164.0386199951172,10)"><text class="blocklyText" x="0" y="13">)</text></g><g class="blocklyDraggable" transform="translate(72.84822082519531,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angel<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g><g class="blocklyDraggable" transform="translate(0,48)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 152.32350158691406  v 5  H 182.32350158691406  V 5  H 182.32350158691406  V 32  H 182.32350158691406  V 32  V 36  h -152.82350158691406  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 60.445220947265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 152.32350158691406  v 5  H 182.32350158691406  V 5  H 182.32350158691406  V 32  H 182.32350158691406  V 32  V 36  h -152.82350158691406  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 60.445220947265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 181.82350158691406  H 181.82350158691406  M 0.5,35.5  V 0.5 
 M 153.8686065673828,5.5  v 27  h -92.92338562011719  M 60.445220947265625,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">log</text></g><g transform="translate(39.56333923339844,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(163.3686065673828,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(53.445220947265625,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 98.42338562011719  H 98.42338562011719  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" transform="translate(0,37)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 285.1194763183594  v 5  H 315.1194763183594  V 5  H 315.1194763183594  V 32  H 315.1194763183594  V 32  V 36  h -285.6194763183594  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 285.1194763183594  v 5  H 315.1194763183594  V 5  H 315.1194763183594  V 32  H 315.1194763183594  V 32  V 36  h -285.6194763183594  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 314.6194763183594  H 314.6194763183594  M 0,36  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 0.5 
 M 163.66818237304688,5.5  v 27  h -74.19039916992188  M 88.977783203125,10  m -5,14.3  l 3.68,-2.1  M 286.6645812988281,5.5  v 27  h -92.92338562011719  M 193.24119567871094,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">cannon</text></g><g transform="translate(68.09590148925781,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(173.16818237304688,10)"><text class="blocklyText" x="0" y="13">,</text></g><g transform="translate(296.1645812988281,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(81.977783203125,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angel<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" transform="translate(186.24119567871094,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 98.42338562011719  H 98.42338562011719  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g></g></g><g class="blocklyDraggable blocklyDraggable" transform="translate(120.11665344238281,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#495284" d=" m 8,0  h 44.45954895019531  v 5  H 52.45954895019531  V 5  H 52.45954895019531  V 21  H 52.45954895019531  V 21  V 25  h -44.45954895019531  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#5b67a5" d=" m 8,0  h 44.45954895019531  v 5  H 52.45954895019531  V 5  H 52.45954895019531  V 21  H 52.45954895019531  V 21  V 25  h -44.45954895019531  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8c95c0" d=" m 8,0  m 0.5,0.5  H 51.95954895019531  H 51.95954895019531  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: text;"><rect rx="4" ry="4" x="0" y="0" height="16" width="34.45954895019531" class="blocklyFieldRect"></rect><text class="blocklyText" x="5" y="13">0</text></g></g></g>
</svg>
`;
      break;
    case 5:
      content = `
${BlocklyGames.getMsg('Pond.helpText05', true)}
<br><br>
<svg height=300 width=400 class="geras-renderer classic-theme">
<g class="blocklyDraggable" transform="translate(1,1)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 151.3428497314453  v 5  H 181.3428497314453  V 5  H 181.3428497314453  V 32  H 181.3428497314453  V 32  V 36  h -151.8428497314453  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 30.153182983398438  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 151.3428497314453  v 5  H 181.3428497314453  V 5  H 181.3428497314453  V 32  H 181.3428497314453  V 32  V 36  h -151.8428497314453  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 30.153182983398438  v -27 z"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 180.8428497314453  H 180.8428497314453  M 0.5,35.5  V 8 
 M 157.76983642578125,5.5  v 27  h -30.153182983398438  M 127.11665344238281,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">var</text></g><g class="blocklyEditableText" transform="translate(35.36505126953125,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g><g transform="translate(102.55545043945312,10)"><text class="blocklyText" x="0" y="13">=</text></g><g transform="translate(167.26983642578125,10)"><text class="blocklyText" x="0" y="13">;</text></g><g class="blocklyDraggable blocklyDraggable" transform="translate(120.11665344238281,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#495284" d=" m 8,0  h 28.153182983398438  v 5  H 36.15318298339844  V 5  H 36.15318298339844  V 21  H 36.15318298339844  V 21  V 25  h -28.153182983398438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#5b67a5" d=" m 8,0  h 28.153182983398438  v 5  H 36.15318298339844  V 5  H 36.15318298339844  V 21  H 36.15318298339844  V 21  V 25  h -28.153182983398438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8c95c0" d=" m 8,0  m 0.5,0.5  H 35.65318298339844  H 35.65318298339844  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: text;"><rect rx="4" ry="4" x="0" y="0" height="16" width="18.153182983398438" class="blocklyFieldRect"></rect><text class="blocklyText" x="5" y="13">0</text></g></g><g class="blocklyDraggable" transform="translate(0,37)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 312.84315490722656  v 5  H 342.84315490722656  V 5  H 342.84315490722656  V 43  H 342.84315490722656  V 43  V 47  h -313.34315490722656  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 145.84963989257812,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 312.84315490722656  v 5  H 342.84315490722656  V 5  H 342.84315490722656  V 43  H 342.84315490722656  V 43  V 47  h -313.34315490722656  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 145.84963989257812,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 342.34315490722656  H 342.34315490722656  M 0.5,46.5  V 0.5 
 M 319.2701416015625,5.5  v 38  h -172.92050170898438  M 145.84963989257812,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">var</text></g><g class="blocklyEditableText" transform="translate(35.36505126953125,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g><g transform="translate(121.28843688964844,10)"><text class="blocklyText" x="0" y="13">=</text></g><g transform="translate(328.7701416015625,10)"><text class="blocklyText" x="0" y="13">;</text></g><g class="blocklyDraggable" style="display: block;" transform="translate(138.84963989257812,6)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 8,0  m 0.5,0.5  H 178.42050170898438  H 178.42050170898438  M 8.5,35.5  M 8.5,35.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
 M 154.5386199951172,5.5  v 27  h -74.19039916992188  M 79.84822082519531,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(18,10)"><text class="blocklyText" x="0" y="13">scan</text></g><g transform="translate(58.966339111328125,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(164.0386199951172,10)"><text class="blocklyText" x="0" y="13">)</text></g><g class="blocklyDraggable" transform="translate(72.84822082519531,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g><g class="blocklyDraggable" transform="translate(0,48)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 152.32350158691406  v 5  H 182.32350158691406  V 5  H 182.32350158691406  V 32  H 182.32350158691406  V 32  V 36  h -152.82350158691406  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 60.445220947265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 152.32350158691406  v 5  H 182.32350158691406  V 5  H 182.32350158691406  V 32  H 182.32350158691406  V 32  V 36  h -152.82350158691406  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 60.445220947265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 181.82350158691406  H 181.82350158691406  M 0.5,35.5  V 0.5 
 M 153.8686065673828,5.5  v 27  h -92.92338562011719  M 60.445220947265625,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">log</text></g><g transform="translate(39.56333923339844,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(163.3686065673828,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(53.445220947265625,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 98.42338562011719  H 98.42338562011719  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" transform="translate(0,37)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#498449" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 135.7952423095703  v 5  H 165.7952423095703  V 5  H 165.7952423095703  V 32  H 165.7952423095703  V 36  H 50  l -6,4  -3,0  -6,-4  h -7 a 8 8 0 0,0 -8,8  v 61 a 8 8 0 0,0 8,8  H 50  H 50  V 118  H 50  V 134  H 50  V 134  V 138  h -20.5  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 68.3621826171875,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 63.58195495605469  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#5ba55b" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 135.7952423095703  v 5  H 165.7952423095703  V 5  H 165.7952423095703  V 32  H 165.7952423095703  V 36  H 50  l -6,4  -3,0  -6,-4  h -7 a 8 8 0 0,0 -8,8  v 61 a 8 8 0 0,0 8,8  H 50  H 50  V 118  H 50  V 134  H 50  V 134  V 138  h -20.5  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 68.3621826171875,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 63.58195495605469  v -27 z"></path><path class="blocklyPathLight" stroke="#8cc08c" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 165.2952423095703  H 165.2952423095703  M 20,113  m 1.9895923599143455,-1.9895923599143455 a 8.5 8.5 0 0,0 6.0104076400856545,2.4895923599143455  l 21.5,0  H 49.5  M 0,138  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 0.5 
 M 132.4441375732422,5.5  v 27  h -63.58195495605469  M 68.3621826171875,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">while&nbsp;(</text></g><g transform="translate(141.9441375732422,10)"><text class="blocklyText" x="0" y="13">)&nbsp;{</text></g><g transform="translate(10,118)"><text class="blocklyText" x="0" y="13">}</text></g><g class="blocklyDraggable" transform="translate(61.3621826171875,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#496684" d=" m 8,0  h 61.58195495605469  v 5  H 69.58195495605469  V 5  H 69.58195495605469  V 21  H 69.58195495605469  V 21  V 25  h -61.58195495605469  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#5b80a5" d=" m 8,0  h 61.58195495605469  v 5  H 69.58195495605469  V 5  H 69.58195495605469  V 21  H 69.58195495605469  V 21  V 25  h -61.58195495605469  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8ca6c0" d=" m 8,0  m 0.5,0.5  H 69.08195495605469  H 69.08195495605469  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="51.58195495605469" class="blocklyFieldRect blocklyDropdownRect" stroke="#8ca6c0" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">true<tspan style="fill: rgb(91, 128, 165);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" transform="translate(21,37)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 147.41299438476562  v 5  H 177.41299438476562  V 5  H 177.41299438476562  V 32  H 177.41299438476562  V 32  V 36  h -147.91299438476562  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 74.2677001953125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 147.41299438476562  v 5  H 177.41299438476562  V 5  H 177.41299438476562  V 32  H 177.41299438476562  V 32  V 36  h -147.91299438476562  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 74.2677001953125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 176.91299438476562  H 176.91299438476562  M 0.5,35.5  V 8 
 M 148.95809936523438,5.5  v 27  h -74.19039916992188  M 74.2677001953125,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">swim</text></g><g transform="translate(53.38581848144531,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(158.45809936523438,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(67.2677001953125,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" style="display: block;" transform="translate(0,37)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 285.1194763183594  v 5  H 315.1194763183594  V 5  H 315.1194763183594  V 32  H 315.1194763183594  V 32  V 36  h -285.6194763183594  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 285.1194763183594  v 5  H 315.1194763183594  V 5  H 315.1194763183594  V 32  H 315.1194763183594  V 32  V 36  h -285.6194763183594  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 314.6194763183594  H 314.6194763183594  M 0,36  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 0.5 
 M 163.66818237304688,5.5  v 27  h -74.19039916992188  M 88.977783203125,10  m -5,14.3  l 3.68,-2.1  M 286.6645812988281,5.5  v 27  h -92.92338562011719  M 193.24119567871094,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">cannon</text></g><g transform="translate(68.09590148925781,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(173.16818237304688,10)"><text class="blocklyText" x="0" y="13">,</text></g><g transform="translate(296.1645812988281,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(81.977783203125,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" transform="translate(186.24119567871094,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 98.42338562011719  H 98.42338562011719  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g></g></g></g></g></g>
</svg>
<br><br>
`;
      break;
    case 6:
      content = `
${BlocklyGames.getMsg('Pond.helpText06', true)}
<svg height=400 width=500 class="geras-renderer classic-theme">
<g class="blocklyBlockCanvas" transform="translate(1,1) scale(1)"><g class="blocklyCursor"><g width="100" height="5"><rect width="100" height="5" style="display: none;"><animate attributeType="XML" attributeName="fill" dur="1s" values="#cc0a0a;transparent;transparent;" repeatCount="indefinite"></animate></rect><rect class="blocklyVerticalMarker" rx="10" ry="10" style="display: none;"></rect><path transform="" style="display: none;"><animate attributeType="XML" attributeName="fill" dur="1s" values="#cc0a0a;transparent;transparent;" repeatCount="indefinite"></animate></path><path transform="" fill="none" stroke-width="4" style="display: none;"><animate attributeType="XML" attributeName="stroke" dur="1s" values="#cc0a0a;transparent;transparent;" repeatCount="indefinite"></animate></path></g></g><g class="blocklyDraggable" transform="translate(66,23)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 151.3428497314453  v 5  H 181.3428497314453  V 5  H 181.3428497314453  V 32  H 181.3428497314453  V 32  V 36  h -151.8428497314453  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 30.153182983398438  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 151.3428497314453  v 5  H 181.3428497314453  V 5  H 181.3428497314453  V 32  H 181.3428497314453  V 32  V 36  h -151.8428497314453  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 127.11665344238281,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 30.153182983398438  v -27 z"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 180.8428497314453  H 180.8428497314453  M 0.5,35.5  V 8 
 M 157.76983642578125,5.5  v 27  h -30.153182983398438  M 127.11665344238281,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">var</text></g><g class="blocklyEditableText" transform="translate(35.36505126953125,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g><g transform="translate(102.55545043945312,10)"><text class="blocklyText" x="0" y="13">=</text></g><g transform="translate(167.26983642578125,10)"><text class="blocklyText" x="0" y="13">;</text></g><g class="blocklyDraggable blocklyDraggable" transform="translate(120.11665344238281,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#495284" d=" m 8,0  h 28.153182983398438  v 5  H 36.15318298339844  V 5  H 36.15318298339844  V 21  H 36.15318298339844  V 21  V 25  h -28.153182983398438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#5b67a5" d=" m 8,0  h 28.153182983398438  v 5  H 36.15318298339844  V 5  H 36.15318298339844  V 21  H 36.15318298339844  V 21  V 25  h -28.153182983398438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8c95c0" d=" m 8,0  m 0.5,0.5  H 35.65318298339844  H 35.65318298339844  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: text;"><rect rx="4" ry="4" x="0" y="0" height="16" width="18.153182983398438" class="blocklyFieldRect"></rect><text class="blocklyText" x="5" y="13">0</text></g></g><g class="blocklyDraggable" style="display: block;" transform="translate(0,37)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 147.41299438476562  v 5  H 177.41299438476562  V 5  H 177.41299438476562  V 32  H 177.41299438476562  V 32  V 36  h -147.91299438476562  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 74.2677001953125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 147.41299438476562  v 5  H 177.41299438476562  V 5  H 177.41299438476562  V 32  H 177.41299438476562  V 32  V 36  h -147.91299438476562  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 74.2677001953125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 176.91299438476562  H 176.91299438476562  M 0.5,35.5  V 0.5 
 M 148.95809936523438,5.5  v 27  h -74.19039916992188  M 74.2677001953125,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">swim</text></g><g transform="translate(53.38581848144531,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(158.45809936523438,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(67.2677001953125,6.000000000000057)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" style="display: block;" transform="translate(0,37)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#498449" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 135.7952423095703  v 5  H 165.7952423095703  V 5  H 165.7952423095703  V 32  H 165.7952423095703  V 36  H 50  l -6,4  -3,0  -6,-4  h -7 a 8 8 0 0,0 -8,8  v 211 a 8 8 0 0,0 8,8  H 50  H 50  V 268  H 50  V 284  H 50  V 284  V 288  h -20.5  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 68.3621826171875,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 63.58195495605469  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#5ba55b" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 135.7952423095703  v 5  H 165.7952423095703  V 5  H 165.7952423095703  V 32  H 165.7952423095703  V 36  H 50  l -6,4  -3,0  -6,-4  h -7 a 8 8 0 0,0 -8,8  v 211 a 8 8 0 0,0 8,8  H 50  H 50  V 268  H 50  V 284  H 50  V 284  V 288  h -20.5  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 68.3621826171875,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 63.58195495605469  v -27 z"></path><path class="blocklyPathLight" stroke="#8cc08c" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 165.2952423095703  H 165.2952423095703  M 20,263  m 1.9895923599143455,-1.9895923599143455 a 8.5 8.5 0 0,0 6.0104076400856545,2.4895923599143455  l 21.5,0  H 49.5  M 0,288  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 0.5 
 M 132.4441375732422,5.5  v 27  h -63.58195495605469  M 68.3621826171875,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">while&nbsp;(</text></g><g transform="translate(141.9441375732422,10)"><text class="blocklyText" x="0" y="13">)&nbsp;{</text></g><g transform="translate(10,268)"><text class="blocklyText" x="0" y="13">}</text></g><g class="blocklyDraggable" transform="translate(61.3621826171875,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#496684" d=" m 8,0  h 61.58195495605469  v 5  H 69.58195495605469  V 5  H 69.58195495605469  V 21  H 69.58195495605469  V 21  V 25  h -61.58195495605469  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#5b80a5" d=" m 8,0  h 61.58195495605469  v 5  H 69.58195495605469  V 5  H 69.58195495605469  V 21  H 69.58195495605469  V 21  V 25  h -61.58195495605469  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8ca6c0" d=" m 8,0  m 0.5,0.5  H 69.08195495605469  H 69.08195495605469  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="51.58195495605469" class="blocklyFieldRect blocklyDropdownRect" stroke="#8ca6c0" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">true<tspan style="fill: rgb(91, 128, 165);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" style="display: block;" transform="translate(21,37)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 312.84315490722656  v 5  H 342.84315490722656  V 5  H 342.84315490722656  V 43  H 342.84315490722656  V 43  V 47  h -313.34315490722656  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 145.84963989257812,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 312.84315490722656  v 5  H 342.84315490722656  V 5  H 342.84315490722656  V 43  H 342.84315490722656  V 43  V 47  h -313.34315490722656  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 145.84963989257812,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 172.92050170898438  v -38 z"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 342.34315490722656  H 342.34315490722656  M 0.5,46.5  V 8 
 M 319.2701416015625,5.5  v 38  h -172.92050170898438  M 145.84963989257812,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">var</text></g><g class="blocklyEditableText" transform="translate(35.36505126953125,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText blocklyDropdownText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g><g transform="translate(121.28843688964844,10)"><text class="blocklyText" x="0" y="13">=</text></g><g transform="translate(328.7701416015625,10)"><text class="blocklyText" x="0" y="13">;</text></g><g class="blocklyDraggable" transform="translate(138.84963989257812,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 8,0  h 170.92050170898438  v 5  H 178.92050170898438  V 5  H 178.92050170898438  V 32  H 178.92050170898438  V 32  V 36  h -170.92050170898438  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 79.84822082519531,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 8,0  m 0.5,0.5  H 178.42050170898438  H 178.42050170898438  M 8.5,35.5  M 8.5,35.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
 M 154.5386199951172,5.5  v 27  h -74.19039916992188  M 79.84822082519531,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(18,10)"><text class="blocklyText" x="0" y="13">scan</text></g><g transform="translate(58.966339111328125,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(164.0386199951172,10)"><text class="blocklyText" x="0" y="13">)</text></g><g class="blocklyDraggable" transform="translate(72.84822082519531,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g><g class="blocklyDraggable" style="display: block;" transform="translate(0,48)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 152.32350158691406  v 5  H 182.32350158691406  V 5  H 182.32350158691406  V 32  H 182.32350158691406  V 32  V 36  h -152.82350158691406  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 60.445220947265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 152.32350158691406  v 5  H 182.32350158691406  V 5  H 182.32350158691406  V 32  H 182.32350158691406  V 32  V 36  h -152.82350158691406  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 60.445220947265625,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 181.82350158691406  H 181.82350158691406  M 0.5,35.5  V 0.5 
 M 153.8686065673828,5.5  v 27  h -92.92338562011719  M 60.445220947265625,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">log</text></g><g transform="translate(39.56333923339844,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(163.3686065673828,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(53.445220947265625,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 98.42338562011719  H 98.42338562011719  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable blocklyDraggable" transform="translate(0,37)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#496684" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 283.2476348876953  v 5  H 313.2476348876953  V 5  H 313.2476348876953  V 43  H 313.2476348876953  V 47  H 50  l -6,4  -3,0  -6,-4  h -7 a 8 8 0 0,0 -8,8  v 13 a 8 8 0 0,0 8,8  H 50  H 50  V 81  H 50  V 97  H 50  V 97  V 101  h -20.5  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 69.28488159179688,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 210.1116485595703  v -38 z"></path><path class="blocklyPath" stroke="none" fill="#5b80a5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 283.2476348876953  v 5  H 313.2476348876953  V 5  H 313.2476348876953  V 43  H 313.2476348876953  V 47  H 50  l -6,4  -3,0  -6,-4  h -7 a 8 8 0 0,0 -8,8  v 13 a 8 8 0 0,0 8,8  H 50  H 50  V 81  H 50  V 97  H 50  V 97  V 101  h -20.5  l -6,4  -3,0  -6,-4  h -14.5  H 0 z
 M 69.28488159179688,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 18  h 210.1116485595703  v -38 z"></path><path class="blocklyPathLight" stroke="#8ca6c0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 312.7476348876953  H 312.7476348876953  M 20,76  m 1.9895923599143455,-1.9895923599143455 a 8.5 8.5 0 0,0 6.0104076400856545,2.4895923599143455  l 21.5,0  H 49.5  M 0.5,100.5  V 0.5 
 M 279.8965301513672,5.5  v 38  h -210.1116485595703  M 69.28488159179688,10  m -5,14.3  l 3.68,-2.1 "></path><g class="blocklyIconGroup" display="block" transform="translate(10,10)"><rect class="blocklyIconShape" rx="4" ry="4" height="16" width="16"></rect><path class="blocklyIconSymbol" d="m4.203,7.296 0,1.368 -0.92,0.677 -0.11,0.41 0.9,1.559 0.41,0.11 1.043,-0.457 1.187,0.683 0.127,1.134 0.3,0.3 1.8,0 0.3,-0.299 0.127,-1.138 1.185,-0.682 1.046,0.458 0.409,-0.11 0.9,-1.559 -0.11,-0.41 -0.92,-0.677 0,-1.366 0.92,-0.677 0.11,-0.41 -0.9,-1.559 -0.409,-0.109 -1.046,0.458 -1.185,-0.682 -0.127,-1.138 -0.3,-0.299 -1.8,0 -0.3,0.3 -0.126,1.135 -1.187,0.682 -1.043,-0.457 -0.41,0.11 -0.899,1.559 0.108,0.409z"></path><circle class="blocklyIconShape" r="2.7" cx="8" cy="8"></circle></g><g transform="translate(37,10)"><text class="blocklyText" x="0" y="13">if&nbsp;(</text></g><g transform="translate(289.3965301513672,10)"><text class="blocklyText" x="0" y="13">)&nbsp;{</text></g><g transform="translate(10,81)"><text class="blocklyText" x="0" y="13">}</text></g><g class="blocklyDraggable" transform="translate(62.284881591796875,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#496684" d=" m 8,0  h 208.1116485595703  v 5  H 216.1116485595703  V 5  H 216.1116485595703  V 32  H 216.1116485595703  V 32  V 36  h -208.1116485595703  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 24,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z M 167.80528259277344,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 38.306365966796875  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#5b80a5" d=" m 8,0  h 208.1116485595703  v 5  H 216.1116485595703  V 5  H 216.1116485595703  V 32  H 216.1116485595703  V 32  V 36  h -208.1116485595703  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
 M 24,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z M 167.80528259277344,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 38.306365966796875  v -27 z"></path><path class="blocklyPathLight" stroke="#8ca6c0" d=" m 8,0  m 0.5,0.5  H 215.6116485595703  H 215.6116485595703  M 8.5,35.5  M 8.5,35.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
 M 117.42338562011719,5.5  v 27  h -92.92338562011719  M 24,10  m -5,14.3  l 3.68,-2.1  M 206.6116485595703,5.5  v 27  h -38.306365966796875  M 167.80528259277344,10  m -5,14.3  l 3.68,-2.1 "></path><g class="blocklyEditableText" transform="translate(121.92338562011719,10)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="34.88189697265625" class="blocklyFieldRect blocklyDropdownRect" stroke="#8ca6c0" fill="transparent"></rect><text class="blocklyText blocklyDropdownText blocklyDropdownText" text-anchor="start" x="5" y="13">‏&lt;<tspan style="fill: rgb(91, 128, 165);"> ▾</tspan></text><image style="display: none;"></image></g><g class="blocklyDraggable" transform="translate(17,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 98.42338562011719  H 98.42338562011719  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable blocklyDraggable" transform="translate(160.80528259277344,6)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#495284" d=" m 8,0  h 36.306365966796875  v 5  H 44.306365966796875  V 5  H 44.306365966796875  V 21  H 44.306365966796875  V 21  V 25  h -36.306365966796875  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#5b67a5" d=" m 8,0  h 36.306365966796875  v 5  H 44.306365966796875  V 5  H 44.306365966796875  V 21  H 44.306365966796875  V 21  V 25  h -36.306365966796875  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#8c95c0" d=" m 8,0  m 0.5,0.5  H 43.806365966796875  H 43.806365966796875  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: text;"><rect rx="4" ry="4" x="0" y="0" height="16" width="26.306365966796875" class="blocklyFieldRect"></rect><text class="blocklyText" x="5" y="13">20</text></g></g></g><g class="blocklyDraggable" transform="translate(21,48)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 51.546142578125  v 5  H 81.546142578125  V 5  H 81.546142578125  V 21  H 81.546142578125  V 21  V 25  h -52.046142578125  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  m 0,8 a 8 8 0 0,1 8,-8  h 7  l 6,4  3,0  6,-4  h 51.546142578125  v 5  H 81.546142578125  V 5  H 81.546142578125  V 21  H 81.546142578125  V 21  V 25  h -52.046142578125  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,8 a 7.5 7.5 0 0,1 8,-7.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 81.046142578125  H 81.046142578125  M 0,25  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 8 
"></path><g transform="translate(10,5)"><text class="blocklyText" x="0" y="13">stop</text></g><g transform="translate(47.70936584472656,5)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(62.59124755859375,5)"><text class="blocklyText" x="0" y="13">);</text></g></g><g class="blocklyDraggable" style="display: block;" transform="translate(0,102)"><path class="blocklyPathDark" transform="translate(1,1)" fill="#7a4984" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 285.1194763183594  v 5  H 315.1194763183594  V 5  H 315.1194763183594  V 32  H 315.1194763183594  V 32  V 36  h -285.6194763183594  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPath" stroke="none" fill="#995ba5" d=" m 0,0  h 15  l 6,4  3,0  6,-4  h 285.1194763183594  v 5  H 315.1194763183594  V 5  H 315.1194763183594  V 32  H 315.1194763183594  V 32  V 36  h -285.6194763183594  l -6,4  -3,0  -6,-4  h -6.5 a 8 8 0 0,1 -8,-8 z
 M 88.977783203125,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 74.19039916992188  v -27 z M 193.24119567871094,5  v 5  c 0,10  -8,-8  -8,7.5  s 8,-2.5  8,7.5  v 7  h 92.92338562011719  v -27 z"></path><path class="blocklyPathLight" stroke="#b88cc0" d=" m 0,0  m 0.5,0.5  H 14.5  h 0.5  l 6,4  3,0  6,-4  H 314.6194763183594  H 314.6194763183594  M 0,36  m 2.6966991411008934,-2.6966991411008934 a 7.5 7.5 0 0,1 -2.1966991411008934,-5.303300858899107  V 0.5 
 M 163.66818237304688,5.5  v 27  h -74.19039916992188  M 88.977783203125,10  m -5,14.3  l 3.68,-2.1  M 286.6645812988281,5.5  v 27  h -92.92338562011719  M 193.24119567871094,10  m -5,14.3  l 3.68,-2.1 "></path><g transform="translate(10,10)"><text class="blocklyText" x="0" y="13">cannon</text></g><g transform="translate(68.09590148925781,10)"><text class="blocklyText" x="0" y="13">(</text></g><g transform="translate(173.16818237304688,10)"><text class="blocklyText" x="0" y="13">,</text></g><g transform="translate(296.1645812988281,10)"><text class="blocklyText" x="0" y="13">);</text></g><g class="blocklyDraggable" transform="translate(81.977783203125,6.000000000000057)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 72.19039916992188  v 5  H 80.19039916992188  V 5  H 80.19039916992188  V 21  H 80.19039916992188  V 21  V 25  h -72.19039916992188  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 79.69039916992188  H 79.69039916992188  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="62.190399169921875" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">angle<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g><g class="blocklyDraggable" transform="translate(186.24119567871094,6.000000000000057)" style="display: block;"><path class="blocklyPathDark" transform="translate(1,1)" fill="#844966" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPath" stroke="none" fill="#a55b80" d=" m 8,0  h 90.92338562011719  v 5  H 98.92338562011719  V 5  H 98.92338562011719  V 21  H 98.92338562011719  V 21  V 25  h -90.92338562011719  H 8  V 20  c 0,-10  -8,8  -8,-7.5  s 8,2.5  8,-7.5 z
"></path><path class="blocklyPathLight" stroke="#c08ca6" d=" m 8,0  m 0.5,0.5  H 98.42338562011719  H 98.42338562011719  M 8.5,24.5  M 8.5,24.5  V 20  v -1.5  m -7.36,-0.5  q -1.52,-5.5  0,-11  m 7.36,1  V 0.5 
"></path><g class="blocklyEditableText" transform="translate(13,5)" style="cursor: default;"><rect rx="4" ry="4" x="0" y="0" height="16" width="80.92338562011719" class="blocklyFieldRect blocklyDropdownRect" stroke="#c08ca6" fill="transparent"></rect><text class="blocklyText blocklyDropdownText" text-anchor="start" x="5" y="13">distance<tspan style="fill: rgb(165, 91, 128);"> ▾</tspan></text><image style="display: none;"></image></g></g></g></g></g></g></g></g></g></g>
</svg>`;
      break;
    case 7:
      content = `
${BlocklyGames.getMsg('Pond.helpText4', true)}
<br><br>
<svg height=41 width=250 class="geras-renderer classic-theme">
  <g>
    <path transform="translate(1,1)" fill="#7a4984" d="m 0,8 A 8,8 0 0,1 8,0 H 15 l 6,4 3,0 6,-4 H 40 H 139.25 v 36 H 29.5 l -6,4 -3,0 -6,-4 H 8 a 8,8 0 0,1 -8,-8 z M 110.3,5 h -36.02 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 36.02 z"></path>
    <path fill="#995ba5" d="m 0,8 A 8,8 0 0,1 8,0 H 15 l 6,4 3,0 6,-4 H 40 H 139.25 v 36 H 29.5 l -6,4 -3,0 -6,-4 H 8 a 8,8 0 0,1 -8,-8 z M 110.3,5 h -36.02 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 36.02 z"></path>
    <path class="blocklyPathLight" stroke="#b88cc0" d="m 0.5,7.5 A 7.5,7.5 0 0,1 8,0.5 H 15 l 6,4 3,0 6,-4 H 39.5 M 39.5,0.5 H 138.75 M 2.69,33.3 A 7.5,7.5 0 0,1 0.5,28 V 8 M 110.8,5.5 v 27 h -36.02 M 69.18,24.3 l 3.68,-2.1"></path>
    <g transform="translate(75.28,6)">
      <path transform="translate(1,1)" fill="#bdc2db" d="m 0,0 H 34.02 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
      <path fill="#bdc2db" d="m 0,0 H 34.02 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
      <path class="blocklyPathLight" stroke="#8c95c0" style="display: none;" d="m 0.5,0.5 H 33.52 M 33.52,0.5 M 0.5,24.5 V 18.5 m -7.36,-0.5 q -1.52,-5.5 0,-11 m 7.36,1 V 0.5 H 1"></path>
      <g class="blocklyEditableText" transform="translate(10,5)" style="cursor: text;">
        <rect rx="4" ry="4" x="-5" y="0" height="16" width="24.02"></rect>
        <text class="blocklyText" y="12.5">0
        <tspan>°</tspan></text>
      </g>
    </g>
    <text class="blocklyText" y="12.5" transform="translate(10,10)">swim</text>
    <text class="blocklyText" y="12.5" transform="translate(53.39,10)">(</text>
    <text class="blocklyText" y="12.5" transform="translate(120.3,10)">);</text>
  </g>
</svg>
`;
      break;
    case 8:
      content = `
${BlocklyGames.getMsg('Pond.helpText4', true)}
<pre>swim(0);</pre>
`;
      break;
    case 9:
      content = `
${BlocklyGames.getMsg('Pond.helpText5', true)}
<br><br>
<svg height=37 width=250 class="geras-renderer classic-theme">
  <g transform="translate(8,0)">
    <path transform="translate(1,1)" fill="#496684" d="m 0,0 H 20 H 194.25 v 36 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z M 97.93,5 h -81.93 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 6 h 81.93 z M 184.25,5 h -38.31 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 38.31 z"></path>
    <path fill="#5b80a5" d="m 0,0 H 20 H 194.25 v 36 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z M 97.93,5 h -81.93 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 6 h 81.93 z M 184.25,5 h -38.31 v 5 c 0,10 -8,-8 -8,7.5 s 8,-2.5 8,7.5 v 7 h 38.31 z"></path>
    <path class="blocklyPathLight" stroke="#8ca6c0" d="m 0.5,0.5 H 19.5 M 19.5,0.5 H 193.75 M 0.5,35.5 V 18.5 m -7.36,-0.5 q -1.52,-5.5 0,-11 m 7.36,1 V 0.5 H 1 M 98.43,5.5 v 26 h -81.93 M 10.9,24.3 l 3.68,-2.1 M 184.75,5.5 v 27 h -38.31 M 140.83,24.3 l 3.68,-2.1"></path>
    <g class="blocklyEditableText" transform="translate(107.93,10)" style="cursor: default;">
      <rect rx="4" ry="4" x="-5" y="0" height="16" width="32.0"></rect>
      <text class="blocklyText" y="12.5" text-anchor="start" x="0">&lt;
      <tspan style="fill: rgb(91, 128, 165);"> ▾</tspan></text>
    </g>
    <g transform="translate(146.93,6)">
      <path transform="translate(1,1)" fill="#495284" d="m 0,0 H 36.31 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
      <path fill="#5b67a5" d="m 0,0 H 36.31 v 25 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
      <path class="blocklyPathLight" stroke="#8c95c0" d="m 0.5,0.5 H 35.81 M 35.81,0.5 M 0.5,24.5 V 18.5 m -7.36,-0.5 q -1.52,-5.5 0,-11 m 7.36,1 V 0.5 H 1"></path>
      <g class="blocklyEditableText" transform="translate(10,5)" style="cursor: text;">
        <rect rx="4" ry="4" x="-5" y="0" height="16" width="26.31"></rect>
        <text class="blocklyText" y="12.5">50</text>
      </g>
    </g>
    <g transform="translate(17,6)">
      <path transform="translate(1,1)" fill="#7a4984" d="m 0,0 H 79.93 v 24 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
      <path fill="#995ba5" d="m 0,0 H 79.93 v 24 H 0 V 20 c 0,-10 -8,8 -8,-7.5 s 8,2.5 8,-7.5 z"></path>
      <path class="blocklyPathLight" stroke="#b88cc0" d="m 0.5,0.5 H 79.43 M 79.43,0.5 M 0.5,23.5 V 18.5 m -7.36,-0.5 q -1.52,-5.5 0,-11 m 7.36,1 V 0.5 H 1"></path>
      <text class="blocklyText" y="12.5" transform="translate(10,5)">getX</text>
      <text class="blocklyText" y="12.5" transform="translate(50.16,5)">(</text>
      <text class="blocklyText" y="12.5" transform="translate(65.05,5)">)</text>
    </g>
  </g>
</svg>
<br><br>
<svg height=31 width=250 class="geras-renderer classic-theme">
  <g>
    <path transform="translate(1,1)" fill="#7a4984" d="m 0,8 A 8,8 0 0,1 8,0 H 15 l 6,4 3,0 6,-4 H 81.56 v 24 H 29.5 l -6,4 -3,0 -6,-4 H 8 a 8,8 0 0,1 -8,-8 z"></path>
    <path fill="#995ba5" d="m 0,8 A 8,8 0 0,1 8,0 H 15 l 6,4 3,0 6,-4 H 81.56 v 24 H 29.5 l -6,4 -3,0 -6,-4 H 8 a 8,8 0 0,1 -8,-8 z"></path>
    <path class="blocklyPathLight" stroke="#b88cc0" d="m 0.5,7.5 A 7.5,7.5 0 0,1 8,0.5 H 15 l 6,4 3,0 6,-4 H 81.06 M 81.06,0.5 M 2.69,21.3 A 7.5,7.5 0 0,1 0.5,16 V 8"></path>
    <text class="blocklyText" y="12.5" transform="translate(10,5)">stop</text>
    <text class="blocklyText" y="12.5" transform="translate(47.71,5)">(</text>
    <text class="blocklyText" y="12.5" transform="translate(62.6,5)">);</text>
  </g>
</svg>
`;
      break;
    case 10:
      content = `
${BlocklyGames.getMsg('Pond.helpText6', true)}
<pre>getX() &lt; 50</pre>
<pre>stop();</pre>
`;
      break;
  }
  return `
<!-- Help dialog for idiotic level 5+6 solution. -->
<div id="helpUseScan" class="dialogHiddenContent">
  <div style="padding-bottom: 0.7ex">
    ${BlocklyGames.getMsg('Pond.helpUseScan', true)}
  </div>
  ${BlocklyGames.html.ok()}
</div>
<div id="help" class="dialogHiddenContent">
  <div style="padding-bottom: 0.7ex">
  ${content}
  </div>
  ${BlocklyGames.html.ok()}
</div>
`;
};

/**
 * Target.
 * @returns {string} HTML.
 * @private
 */
Pond.Tutor.html.playerTarget_ = function() {
  return `
<div id="playerTarget" style="display: none">
</div>
`;
};

/**
 * Pendulum.
 * @returns {string} HTML.
 * @private
 */
Pond.Tutor.html.playerPendulum_ = function() {
  return `
<div id="playerPendulum" style="display: none">
/* Slowly moves east and west.  Does not fire. */
var west = false;
while (true) {
  if (west) {
    if (getX() > 25) {
      swim(180, 25);
    } else {
      west = false;
      swim(0, 0);
    }
  } else {
    if (getX() < 75) {
      swim(0, 25);
    } else {
      west = true;
      swim(0, 0);
    }
  }
}
</div>
`;
};

/**
 * Scared.
 * @returns {string} HTML.
 * @private
 */
Pond.Tutor.html.playerScared_ = function() {
  return `
<div id="playerScared" style="display: none">
/* Moves south-west when hit.  Does not fire. */
var d = damage();
while (true) {
  if (d != damage()) {
    swim(45, 100);
    var t = 0;
    for (var t = 0; t < 100; t++) {}
    d = damage();
    stop();
  }
}
</div>
`;
};


/**
 * Defense.
 * @returns {string} HTML.
 * @private
 */
Pond.Tutor.html.playerDefense_ = function() {
  return `
<div id="playerDefense" style="display: none">
/* Moves south-west when hit.  Does not fire. */

while (true) {
  if (damage() > 80) {
    if (getX() <= 10 && getY() <= 10) {swim(90, 100);}
    else if (getX() <= 10 && getY() >= 90) {swim(0, 100);}
    else if (getX() >= 90 && getY() >= 90) {swim(270, 100);}
    else if (getX() >= 90 && getY() <= 10) {swim(180, 100);}
    else {
      if (getX() <= 10) {swim(90, 100);}
      if (getY() <= 10) {swim(180, 100);}
      if (getX() >= 90) {swim(270, 100);}
      if (getY() >= 90) {swim(0, 100);}
    }
    var angle = 0;
    while (angle < 360){
      var distance = scan(angle);
      if (distance <= 70 && distance >= 10){
        cannon(angle, distance-5);
      }else{
        angle += 5;
      }
    }
  }
}
</div>
`;
};