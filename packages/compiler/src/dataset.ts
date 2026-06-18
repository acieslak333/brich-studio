/**
 * Dataset parsing for batch rendering (§5, §12, M5.1). A dataset is a set of
 * rows (CSV or JSON); each row becomes a binding map, and the template renders
 * once per row — one results video per model / run / checkpoint.
 *
 * Pure and deterministic: parsing does no I/O (callers read the file).
 */

export type DatasetRow = Record<string, unknown>;
export type DatasetFormat = "csv" | "json";

/** Infer the dataset format from a filename extension. */
export function inferDatasetFormat(path: string): DatasetFormat {
  return /\.json$/i.test(path) ? "json" : "csv";
}

/** Parse a dataset string into rows. */
export function parseDataset(text: string, format: DatasetFormat): DatasetRow[] {
  if (format === "json") {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw new Error("JSON dataset must be an array of row objects");
    }
    return data as DatasetRow[];
  }
  return parseCsv(text);
}

/** Coerce a CSV cell to number/boolean when it clearly is one, else string. */
function coerceCell(value: string): unknown {
  const t = value.trim();
  if (t === "") return "";
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function parseCsv(text: string): DatasetRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: DatasetRow = {};
    header.forEach((key, i) => {
      row[key] = coerceCell(cells[i] ?? "");
    });
    return row;
  });
}

/** Split a single CSV line, honoring double-quoted fields and `""` escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
