# Pond: Tutor и Duck

Сохранены готовые статические сборки двух игр Blockly Games:

- `appengine/pond-tutor.html` — Pond Tutor.
- `appengine/pond-duck.html` — Pond Duck.
- `appengine/index.html` — страница выбора игры.

Папка `appengine` — корень сайта для статического хостинга. Для локального запуска: `python -m http.server 8000 --directory appengine`.

Компиляция и установка зависимостей не нужны. Исходники для компиляции, инструменты сборки и остальные игры удалены. GitHub Pages публикует содержимое `appengine` напрямую.

Код игр: `appengine/pond/tutor/generated/compressed.js` и `appengine/pond/duck/generated/compressed.js`. Переводы сохранены рядом в `generated/msg`. Общие ресурсы и необходимые библиотеки находятся в `appengine/common`, `appengine/pond` и `appengine/third-party`.

Дальнейшие изменения вносятся непосредственно в сохранённые JS, HTML и CSS. Готовые сборки и зависимости больше не исключаются из Git.

Исходный проект: https://github.com/google/blockly-games. Лицензия: Apache-2.0, см. `LICENSE`.
