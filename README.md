# source-map-dev-tool

Yet another tool for inspecting [source map](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#) data.

## Why?

Programs that generate/consume source maps often internally convert line and column numbers between different conventions. All of these exist in the wild, sometimes all in the same toolchain:

- 0-based lines, 0-based columns
- 1-based lines, 0-based columns
- 1-based lines, 1-based columns

(I haven't seen 0-based lines and 1-based columns yet, though.)

Such conversions are prone to off-by-one errors. This tool is specifically aimed at debugging those, by letting the user set the numbering convention interactively.
