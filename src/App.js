// @flow

import React, { useMemo } from "react";
import useSessionStorageState from "use-session-storage-state";
import { decode, encode } from "vlq";
import githubMark from "./Octicons-mark-github.svg";

const s = {
  app: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch"
  },
  header: {
    backgroundColor: "#aaccff",
    padding: 10,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  h1: { margin: 0 },
  githubMark: { height: "1em" },
  content: {
    padding: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start"
  },
  table: {
    emptyCells: "show",
    borderCollapse: "collapse"
  },
  headerRow: {
    fontWeight: "bold"
  },
  controlRow: { textAlign: "end" },
  rowValid: { fontVariantNumeric: "tabular-nums", textAlign: "end" },
  rowInvalid: {
    fontVariantNumeric: "tabular-nums",
    textAlign: "end",
    backgroundColor: "#ee9999"
  },
  cell: {
    border: "1px solid #cccccc",
    padding: "5px"
  },
  input: {
    marginTop: "10px",
    alignSelf: "stretch",
    fontFamily:
      'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace'
  },
  numInput: {
    textAlign: "end",
    width: "2em"
  }
};

function App() {
  const [input, setInput] = useSessionStorageState("input", { defaultValue: "" });

  return (
    <div style={s.app}>
      <header style={s.header}>
        <h1 style={s.h1}>Source map dev tool</h1>
        <span>
          <a href="https://github.com/motiz88/source-map-dev-tool">
            View on GitHub
          </a>{" "}
          <a href="https://github.com/motiz88/source-map-dev-tool">
            <img src={githubMark} style={s.githubMark} />
          </a>
        </span>
      </header>
      <div style={s.content}>
        Input:
        <textarea
          placeholder="Paste encoded mappings, e.g. AAAAA;CAACA"
          rows={5}
          value={input}
          onChange={e => setInput(e.target.value)}
          style={s.input}
        />
        <OutputRenderer input={input} />
      </div>
    </div>
  );
}

function OutputRenderer({ input }) {
  return <MappingsRenderer input={input} />;
}

function MappingsRenderer({ input }) {

  const mappings = useMemo(() => parseMappings(input), [input]);
  const [absolute, setAbsolute] = useSessionStorageState("absolute", { defaultValue: true });
  const [baseGeneratedLine, setBaseGeneratedLine] = useSessionStorageState(
    "baseGeneratedLine",
    { defaultValue: 0 }
  );
  const [baseGeneratedColumn, setBaseGeneratedColumn] = useSessionStorageState(
    "baseGeneratedColumn",
    { defaultValue: 0 }
  );
  const [baseOriginalLine, setBaseOriginalLine] = useSessionStorageState(
    "baseOriginalLine",
    { defaultValue: 0 }
  );
  const [baseOriginalColumn, setBaseOriginalColumn] = useSessionStorageState(
    "baseOriginalColumn",
    { defaultValue: 0 }
  );
  if (!input) {
    return null;
  }
  if (mappings && mappings.length) {
    return (
      <>
        <div>{mappings.length} mapping(s) found</div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={absolute}
              onChange={e => setAbsolute(e.target.checked)}
            />{" "}
            Absolute
          </label>
        </div>
        <table style={s.table}>
          <tr style={s.headerRow}>
            <td style={s.cell}>Generated Line</td>
            <td style={s.cell}>
              {absolute ? "" : <>&Delta;</>} Generated Column
            </td>
            <td style={s.cell}>{absolute ? "" : <>&Delta;</>} Source Index</td>
            <td style={s.cell}>{absolute ? "" : <>&Delta;</>} Original Line</td>
            <td style={s.cell}>
              {absolute ? "" : <>&Delta;</>} Original Column
            </td>
            <td style={s.cell}>{absolute ? "" : <>&Delta;</>} Name Index</td>
          </tr>
          <tr style={s.controlRow}>
            <td>
              <StartOffsetInput
                value={baseGeneratedLine}
                onChange={setBaseGeneratedLine}
              />
            </td>
            <td>
              {absolute && (
                <StartOffsetInput
                  value={baseGeneratedColumn}
                  onChange={setBaseGeneratedColumn}
                />
              )}
            </td>
            <td />
            <td>
              {absolute && (
                <StartOffsetInput
                  value={baseOriginalLine}
                  onChange={setBaseOriginalLine}
                />
              )}
            </td>
            <td>
              {absolute && (
                <StartOffsetInput
                  value={baseOriginalColumn}
                  onChange={setBaseOriginalColumn}
                />
              )}
            </td>
            <td />
          </tr>
          {mappings.map((mapping, index) => (
            <tr key={index} style={mapping.valid ? s.rowValid : s.rowInvalid}>
              <td style={s.cell}>
                {baseGeneratedLine + mapping.generatedLine}
              </td>
              <td style={s.cell}>
                {formatValue(
                  absolute
                    ? addNonNull(baseGeneratedColumn, mapping.generatedColumn)
                    : mapping.deltaGeneratedColumn
                )}
              </td>
              <td style={s.cell}>
                {formatValue(
                  absolute ? mapping.sourceIndex : mapping.deltaSourceIndex
                )}
              </td>
              <td style={s.cell}>
                {formatValue(
                  absolute
                    ? addNonNull(baseOriginalLine, mapping.originalLine)
                    : mapping.deltaOriginalLine
                )}
              </td>
              <td style={s.cell}>
                {formatValue(
                  absolute
                    ? addNonNull(baseOriginalColumn, mapping.originalColumn)
                    : mapping.deltaOriginalColumn
                )}
              </td>
              <td style={s.cell}>
                {formatValue(
                  absolute ? mapping.nameIndex : mapping.deltaNameIndex
                )}
              </td>
              {mapping.rest.length ? (
                <td style={s.cell}>Unused: {mapping.rest.join(", ")}</td>
              ) : null}
            </tr>
          ))}
        </table>
      </>
    );
  } else {
    return "Not VLQ-encoded, or no mappings found";
  }
}

function parseMappings(input = "") {
  input = input.replace(/\\\//g, "/");
  if (/^[A-Za-z0-9+/,;]*$/.test(input)) {
    // mappings string
    const mappings = [];

    let generatedColumn = 0,
      sourceIndex = 0,
      originalLine = 0,
      originalColumn = 0,
      nameIndex = 0;
    let generatedLine = 0;
    for (const columnMappings of input.split(";")) {
      generatedColumn = 0;
      for (const columnMapping of columnMappings.split(",")) {
        if (!columnMapping) {
          continue;
        }
        const decoded = decode(columnMapping);
        let valid =
          (decoded.length === 1 ||
            decoded.length === 4 ||
            decoded.length === 5) &&
          decoded.every(x => Number.isInteger(x)) &&
          encode(decoded) === columnMapping;

        const [
          deltaGeneratedColumn,
          deltaSourceIndex,
          deltaOriginalLine,
          deltaOriginalColumn,
          deltaNameIndex,
          ...rest
        ] = decoded;

        const mapping = {
          deltaGeneratedColumn,
          deltaSourceIndex,
          deltaOriginalLine,
          deltaOriginalColumn,
          deltaNameIndex,
          generatedLine,
          generatedColumn: null,
          sourceIndex: null,
          originalLine: null,
          originalColumn: null,
          nameIndex: null,
          rest,
          valid
        };

        generatedColumn += deltaGeneratedColumn;
        mapping.generatedColumn = generatedColumn;
        if (deltaSourceIndex != null) {
          mapping.sourceIndex = sourceIndex = sourceIndex + deltaSourceIndex;
        }
        if (deltaOriginalLine != null) {
          mapping.originalLine = originalLine =
            originalLine + deltaOriginalLine;
        }
        if (deltaOriginalColumn != null) {
          mapping.originalColumn = originalColumn =
            originalColumn + deltaOriginalColumn;
        }
        if (deltaNameIndex != null) {
          mapping.nameIndex = nameIndex = nameIndex + deltaNameIndex;
        }

        mappings.push(mapping);
      }
      ++generatedLine;
    }
    return mappings;
  }
}

function StartOffsetInput({ value, onChange }) {
  return (
    <>
      Start:{" "}
      <input
        type="number"
        style={s.numInput}
        value={value}
        onChange={e => onChange(Number.parseInt(e.target.value, 10))}
      />
    </>
  );
}

function formatValue(a: ?number): string {
  if (a == null) {
    return "-";
  }
  return String(a);
}

function addNonNull(a: ?number, b: ?number): ?number {
  if (a != null && b != null) {
    return a + b;
  }
  return null;
}

export default App;
