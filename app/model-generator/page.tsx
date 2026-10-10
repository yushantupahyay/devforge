"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

/* ── Sources, Dialects & Languages ───────────────────────────── */

type Source = "sql" | "json" | "xml";
const SOURCES: { value: Source; label: string; inputLabel: string }[] = [
  { value: "sql",  label: "SQL",  inputLabel: "SQL — CREATE TABLE" },
  { value: "json", label: "JSON", inputLabel: "JSON — Object or Array" },
  { value: "xml",  label: "XML",  inputLabel: "XML — Document" },
];

const SQL_DIALECTS = [
  { value: "sqlserver", label: "SQL Server / SSMS / T-SQL" },
  { value: "mysql",     label: "MySQL / MariaDB"           },
  { value: "postgresql",label: "PostgreSQL"                },
  { value: "oracle",    label: "Oracle"                    },
  { value: "sqlite",    label: "SQLite"                    },
];

const TARGET_LANGS = [
  { value: "csharp",     label: "C#",              ext: "cs"    },
  { value: "python",     label: "Python",          ext: "py"    },
  { value: "java",       label: "Java",            ext: "java"  },
  { value: "typescript", label: "TypeScript",      ext: "ts"    },
  { value: "javascript", label: "JavaScript",      ext: "js"    },
  { value: "go",         label: "Go",              ext: "go"    },
  { value: "kotlin",     label: "Kotlin",          ext: "kt"    },
  { value: "swift",      label: "Swift",           ext: "swift" },
  { value: "cpp",        label: "C++",             ext: "hpp"   },
  { value: "rust",       label: "Rust",            ext: "rs"    },
];

/* ── Naming mode ─────────────────────────────────────────────── */
// "exact"      → keep identifiers exactly as they appear in the SQL (no case changes)
// "convention" → re-case identifiers to each language's usual style (PascalCase, camelCase, snake_case…)
type NamingMode = "exact" | "convention";

/* ── Type Mapping: sqlType → per-language type ───────────────── */

type TypeMap = Record<string, string> & { default: string };
const TM: Record<string, TypeMap> = {
  // Integers
  INT:          { default:"int",     csharp:"int",         python:"int",       java:"int",             typescript:"number",    javascript:"number",  go:"int32",    kotlin:"Int",           swift:"Int32",    cpp:"int32_t",              rust:"i32"              },
  INTEGER:      { default:"int",     csharp:"int",         python:"int",       java:"int",             typescript:"number",    javascript:"number",  go:"int32",    kotlin:"Int",           swift:"Int32",    cpp:"int32_t",              rust:"i32"              },
  INT4:         { default:"int",     csharp:"int",         python:"int",       java:"int",             typescript:"number",    javascript:"number",  go:"int32",    kotlin:"Int",           swift:"Int32",    cpp:"int32_t",              rust:"i32"              },
  BIGINT:       { default:"long",    csharp:"long",        python:"int",       java:"long",            typescript:"number",    javascript:"number",  go:"int64",    kotlin:"Long",          swift:"Int64",    cpp:"int64_t",              rust:"i64"              },
  INT8:         { default:"long",    csharp:"long",        python:"int",       java:"long",            typescript:"number",    javascript:"number",  go:"int64",    kotlin:"Long",          swift:"Int64",    cpp:"int64_t",              rust:"i64"              },
  SMALLINT:     { default:"short",   csharp:"short",       python:"int",       java:"short",           typescript:"number",    javascript:"number",  go:"int16",    kotlin:"Short",         swift:"Int16",    cpp:"int16_t",              rust:"i16"              },
  INT2:         { default:"short",   csharp:"short",       python:"int",       java:"short",           typescript:"number",    javascript:"number",  go:"int16",    kotlin:"Short",         swift:"Int16",    cpp:"int16_t",              rust:"i16"              },
  TINYINT:      { default:"byte",    csharp:"byte",        python:"int",       java:"byte",            typescript:"number",    javascript:"number",  go:"uint8",    kotlin:"Byte",          swift:"UInt8",    cpp:"uint8_t",              rust:"u8"               },
  MEDIUMINT:    { default:"int",     csharp:"int",         python:"int",       java:"int",             typescript:"number",    javascript:"number",  go:"int32",    kotlin:"Int",           swift:"Int32",    cpp:"int32_t",              rust:"i32"              },
  SERIAL:       { default:"int",     csharp:"int",         python:"int",       java:"int",             typescript:"number",    javascript:"number",  go:"int32",    kotlin:"Int",           swift:"Int32",    cpp:"int32_t",              rust:"i32"              },
  BIGSERIAL:    { default:"long",    csharp:"long",        python:"int",       java:"long",            typescript:"number",    javascript:"number",  go:"int64",    kotlin:"Long",          swift:"Int64",    cpp:"int64_t",              rust:"i64"              },
  SMALLSERIAL:  { default:"short",   csharp:"short",       python:"int",       java:"short",           typescript:"number",    javascript:"number",  go:"int16",    kotlin:"Short",         swift:"Int16",    cpp:"int16_t",              rust:"i16"              },
  // Decimals
  DECIMAL:      { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  NUMERIC:      { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  NUMBER:       { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  MONEY:        { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  SMALLMONEY:   { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  // Floats
  FLOAT:        { default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  FLOAT4:       { default:"float",   csharp:"float",       python:"float",     java:"float",           typescript:"number",    javascript:"number",  go:"float32",  kotlin:"Float",         swift:"Float",    cpp:"float",                rust:"f32"              },
  FLOAT8:       { default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  REAL:         { default:"float",   csharp:"float",       python:"float",     java:"float",           typescript:"number",    javascript:"number",  go:"float32",  kotlin:"Float",         swift:"Float",    cpp:"float",                rust:"f32"              },
  DOUBLE:       { default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  "DOUBLE PRECISION": { default:"double", csharp:"double", python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  BINARY_FLOAT: { default:"float",   csharp:"float",       python:"float",     java:"float",           typescript:"number",    javascript:"number",  go:"float32",  kotlin:"Float",         swift:"Float",    cpp:"float",                rust:"f32"              },
  BINARY_DOUBLE:{ default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  // Strings
  VARCHAR:      { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  VARCHAR2:     { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  NVARCHAR:     { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  NVARCHAR2:    { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  CHAR:         { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  NCHAR:        { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  TEXT:         { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  NTEXT:        { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  TINYTEXT:     { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  MEDIUMTEXT:   { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  LONGTEXT:     { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  CLOB:         { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  NCLOB:        { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  STRING:       { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  "CHARACTER VARYING": { default:"string", csharp:"string", python:"str",      java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  // Boolean
  BIT:          { default:"bool",    csharp:"bool",        python:"bool",      java:"boolean",         typescript:"boolean",   javascript:"boolean", go:"bool",     kotlin:"Boolean",       swift:"Bool",     cpp:"bool",                 rust:"bool"             },
  BOOLEAN:      { default:"bool",    csharp:"bool",        python:"bool",      java:"boolean",         typescript:"boolean",   javascript:"boolean", go:"bool",     kotlin:"Boolean",       swift:"Bool",     cpp:"bool",                 rust:"bool"             },
  BOOL:         { default:"bool",    csharp:"bool",        python:"bool",      java:"boolean",         typescript:"boolean",   javascript:"boolean", go:"bool",     kotlin:"Boolean",       swift:"Bool",     cpp:"bool",                 rust:"bool"             },
  // DateTime
  DATETIME:     { default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  DATETIME2:    { default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  SMALLDATETIME:{ default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  TIMESTAMP:    { default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  TIMESTAMPTZ:  { default:"DateTime",csharp:"DateTimeOffset",python:"datetime",java:"OffsetDateTime",  typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"OffsetDateTime",swift:"Date",     cpp:"std::string",          rust:"DateTime<Utc>"    },
  DATE:         { default:"DateOnly",csharp:"DateOnly",    python:"date",      java:"LocalDate",       typescript:"string",    javascript:"string",  go:"time.Time",kotlin:"LocalDate",     swift:"Date",     cpp:"std::string",          rust:"NaiveDate"        },
  TIME:         { default:"TimeOnly",csharp:"TimeOnly",    python:"time",      java:"LocalTime",       typescript:"string",    javascript:"string",  go:"time.Duration",kotlin:"LocalTime", swift:"Date",     cpp:"std::string",          rust:"NaiveTime"        },
  TIMETZ:       { default:"TimeOnly",csharp:"TimeOnly",    python:"time",      java:"OffsetTime",      typescript:"string",    javascript:"string",  go:"time.Duration",kotlin:"OffsetTime",swift:"Date",     cpp:"std::string",          rust:"NaiveTime"        },
  YEAR:         { default:"int",     csharp:"int",         python:"int",       java:"int",             typescript:"number",    javascript:"number",  go:"int32",    kotlin:"Int",           swift:"Int",      cpp:"int32_t",              rust:"i32"              },
  // GUID/UUID
  UNIQUEIDENTIFIER: { default:"Guid",csharp:"Guid",        python:"UUID",      java:"UUID",            typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"UUID",     cpp:"std::string",          rust:"Uuid"             },
  UUID:         { default:"Guid",    csharp:"Guid",        python:"UUID",      java:"UUID",            typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"UUID",     cpp:"std::string",          rust:"Uuid"             },
  // Binary
  BINARY:       { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  VARBINARY:    { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  BLOB:         { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  TINYBLOB:     { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  MEDIUMBLOB:   { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  LONGBLOB:     { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  IMAGE:        { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  BYTEA:        { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  RAW:          { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  ROWVERSION:   { default:"byte[]",  csharp:"byte[]",      python:"bytes",     java:"byte[]",          typescript:"Uint8Array",javascript:"Buffer",  go:"[]byte",   kotlin:"ByteArray",     swift:"Data",     cpp:"std::vector<uint8_t>", rust:"Vec<u8>"          },
  // JSON / XML
  JSON:         { default:"object",  csharp:"object",      python:"dict",      java:"Object",          typescript:"unknown",   javascript:"object",  go:"interface{}",kotlin:"Any",         swift:"Any",      cpp:"std::string",          rust:"serde_json::Value"},
  JSONB:        { default:"object",  csharp:"object",      python:"dict",      java:"Object",          typescript:"unknown",   javascript:"object",  go:"interface{}",kotlin:"Any",         swift:"Any",      cpp:"std::string",          rust:"serde_json::Value"},
  XML:          { default:"string",  csharp:"XDocument",   python:"str",       java:"Document",        typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  XMLTYPE:      { default:"string",  csharp:"XDocument",   python:"str",       java:"Document",        typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  HIERARCHYID:  { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  GEOGRAPHY:    { default:"object",  csharp:"object",      python:"object",    java:"Object",          typescript:"unknown",   javascript:"object",  go:"interface{}",kotlin:"Any",         swift:"Any",      cpp:"void*",                rust:"Box<dyn Any>"     },
  GEOMETRY:     { default:"object",  csharp:"object",      python:"object",    java:"Object",          typescript:"unknown",   javascript:"object",  go:"interface{}",kotlin:"Any",         swift:"Any",      cpp:"void*",                rust:"Box<dyn Any>"     },
  ENUM:         { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
  ROWID:        { default:"string",  csharp:"string",      python:"str",       java:"String",          typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"String",   cpp:"std::string",          rust:"String"           },
};

/* ── Naming helpers ──────────────────────────────────────────── */
function toPascalCase(s: string) {
  return s.replace(/(?:^|_|\s)(\w)/g, (_, c) => c.toUpperCase()).replace(/[_\s]/g, "");
}
function toCamelCase(s: string) {
  const p = toPascalCase(s); return p.charAt(0).toLowerCase() + p.slice(1);
}
function toSnakeCase(s: string) {
  return s.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "").replace(/__+/g, "_");
}
// Re-cases `raw` according to `style`, unless `mode` is "exact" — in which case
// the original SQL spelling/casing is kept verbatim (only ever used for name
// resolution, never for anything that must be syntactically valid, since the
// parser already strips out spaces / brackets / quotes).
function convName(raw: string, style: "pascal" | "camel" | "snake", mode: NamingMode): string {
  if (mode === "exact") return raw;
  if (style === "pascal") return toPascalCase(raw);
  if (style === "camel")  return toCamelCase(raw);
  return toSnakeCase(raw);
}

/* ── Model ───────────────────────────────────────────────────── */
// A Column is one field of a generated class. SQL columns only ever use the
// scalar fields; JSON/XML fields may instead reference another generated class
// (`refType`) and/or be a list (`arrayDepth` > 0, nested lists for > 1).
interface Column {
  name: string;      // valid identifier
  srcName: string;   // original column / key / tag / attribute name, used for serialization mapping
  sqlType: string; isNullable: boolean;
  isPrimaryKey: boolean; isAutoIncrement: boolean;
  maxLength?: number; precision?: number; scale?: number;
  refType?: string; arrayDepth?: number;
  xmlKind?: "attr" | "elem" | "text";
}
interface ParsedTable { tableName: string; rawTableName: string; srcName: string; columns: Column[] }

/* ── SQL Parser ──────────────────────────────────────────────── */

function splitTopLevel(str: string, delim: string): string[] {
  const parts: string[] = []; let depth = 0, cur = "", inStr = false, sc = "";
  for (const ch of str) {
    if (!inStr && (ch === "'" || ch === '"' || ch === "`")) { inStr = true; sc = ch; }
    else if (inStr && ch === sc) { inStr = false; }
    if (!inStr) {
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if (ch === delim && depth === 0) { parts.push(cur); cur = ""; continue; }
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseColumn(def: string): Column | null {
  const trimmed = def.trim();
  // Skip empty or constraint lines
  const up = trimmed.toUpperCase();
  if (!trimmed || /^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|KEY\s|CHECK\s*\()/i.test(trimmed)) return null;

  // Column name (possibly quoted with [], "", ``) — casing is preserved exactly as written.
  // Only a *quoted* identifier is allowed to contain spaces; an unquoted name must stop at
  // the first whitespace, otherwise a paren-less type (INT, DATE, TEXT…) followed by
  // modifiers like "PRIMARY KEY" or "NOT NULL" gets greedily swallowed into the name.
  let name: string;
  let rest: string;
  const quotedMatch = trimmed.match(/^([\["`])([^\]"`]+)[\]"`]\s+/);
  if (quotedMatch) {
    name = quotedMatch[2].trim().replace(/\s+/g, "_");
    rest = trimmed.slice(quotedMatch[0].length).trim();
  } else {
    const plainMatch = trimmed.match(/^(\w+)\s+/);
    if (!plainMatch) return null;
    name = plainMatch[1];
    rest = trimmed.slice(plainMatch[0].length).trim();
  }

  // Data type — may contain spaces (e.g. "DOUBLE PRECISION", "CHARACTER VARYING")
  const typeMatch = rest.match(/^[\["`]?([\w ]+?)[\]"`]?(?:\s*\(([^)]*)\))?(?:\s|$)/);
  if (!typeMatch) return null;
  const rawType = typeMatch[1].trim().toUpperCase();
  const params  = typeMatch[2] ? typeMatch[2].split(",").map(p => p.trim()) : [];
  // Truncate at CONSTRAINT so a missing trailing comma doesn't bleed constraint
  // text into this column's attribute checks (e.g. PRIMARY KEY → isPrimaryKey)
  const afterFull = rest.slice(typeMatch[0].length).trim();
  const cIdx      = afterFull.toUpperCase().indexOf("CONSTRAINT");
  const afterRaw  = (cIdx >= 0 ? afterFull.slice(0, cIdx) : afterFull).toUpperCase();

  let maxLength: number | undefined;
  let precision: number | undefined;
  let scale: number | undefined;
  if (params.length === 1 && !/^MAX$/i.test(params[0])) maxLength = parseInt(params[0]);
  if (params.length === 2) { precision = parseInt(params[0]); scale = parseInt(params[1]); }

  const isNullable     = !afterRaw.includes("NOT NULL");
  const isPrimaryKey   = afterRaw.includes("PRIMARY KEY");
  const isAutoIncrement =
    /\bIDENTITY\b/.test(afterRaw) || /\bAUTO_INCREMENT\b/.test(afterRaw) ||
    /\bAUTOINCREMENT\b/.test(afterRaw) ||
    rawType === "SERIAL" || rawType === "BIGSERIAL" || rawType === "SMALLSERIAL";

  return { name, srcName: name, sqlType: rawType, isNullable, isPrimaryKey, isAutoIncrement, maxLength, precision, scale };
}

function parseSQL(sql: string): ParsedTable {
  let s = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
  const cm = s.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:GLOBAL\s+|TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[]?[\w][\w\s."`\[\]]*?)\s*\(/i);
  if (!cm) throw new Error("Could not find a CREATE TABLE statement.");

  const rawName = cm[1].trim().replace(/[\[\]"`]/g, "");
  const cleanRawName = (rawName.includes(".") ? rawName.split(".").pop()! : rawName).trim().replace(/\s+/g, "_");
  const tableName = toPascalCase(cleanRawName);

  const startIdx = s.indexOf("(", cm.index!) + 1;
  let depth = 1, endIdx = startIdx;
  while (endIdx < s.length && depth > 0) {
    if (s[endIdx] === "(") depth++; else if (s[endIdx] === ")") depth--;
    if (depth > 0) endIdx++;
  }
  const body = s.slice(startIdx, endIdx);
  const parts = splitTopLevel(body, ",");

  const primaryKeys: string[] = [];
  const columns: Column[] = [];

  for (const part of parts) {
    const t = part.trim().toUpperCase();
    const pkm = part.match(/PRIMARY\s+KEY\s+(?:CLUSTERED\s+|NONCLUSTERED\s+)?\(([^)]+)\)/i);
    if (pkm) { pkm[1].split(",").forEach(k => primaryKeys.push(k.trim().replace(/[\[\]"`]/g, "").replace(/\s+(ASC|DESC)$/i, "").trim())); }
    if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|CHECK\s*\()/i.test(t)) continue;
    const col = parseColumn(part);
    if (col) columns.push(col);
  }
  primaryKeys.forEach(pk => {
    const col = columns.find(c => c.name.toLowerCase() === pk.toLowerCase());
    if (col) col.isPrimaryKey = true;
  });
  if (!columns.length) throw new Error("No columns found. Make sure you pasted a complete CREATE TABLE statement.");
  return { tableName, rawTableName: cleanRawName, srcName: cleanRawName, columns };
}

/* ── JSON / XML shape inference ──────────────────────────────── */
// Both JSON and XML are first reduced to a Shape tree; samples of the same
// thing (array items, repeated XML elements) are merged so that a key missing
// from some samples becomes optional and conflicting scalar types widen.
interface Field { shape: Shape; optional: boolean; xmlKind?: "attr" | "elem" | "text" }
type Shape =
  | { kind: "null" }
  | { kind: "prim"; sqlType: string; nullable?: boolean }
  | { kind: "obj"; fields: Map<string, Field>; nullable?: boolean }
  | { kind: "arr"; item: Shape; nullable?: boolean };

const INT_TYPES = ["INT", "BIGINT"];
function mergePrim(a: string, b: string): string {
  if (a === b) return a;
  if (INT_TYPES.includes(a) && INT_TYPES.includes(b)) return "BIGINT";
  if ([...INT_TYPES, "FLOAT"].includes(a) && [...INT_TYPES, "FLOAT"].includes(b)) return "FLOAT";
  if (["DATETIME", "TIMESTAMPTZ", "DATE"].includes(a) && ["DATETIME", "TIMESTAMPTZ", "DATE"].includes(b)) return "DATETIME";
  return "NVARCHAR";
}

function mergeShapes(a: Shape, b: Shape): Shape {
  if (a.kind === "null") return b.kind === "null" ? a : { ...b, nullable: true };
  if (b.kind === "null") return { ...a, nullable: true };
  const nullable = a.nullable || b.nullable;
  // A single XML element and a repeated one are the same list
  if (a.kind === "arr" && b.kind !== "arr") return { ...a, item: mergeShapes(a.item, b), nullable };
  if (b.kind === "arr" && a.kind !== "arr") return { ...b, item: mergeShapes(a, b.item), nullable };
  if (a.kind === "arr" && b.kind === "arr") return { kind: "arr", item: mergeShapes(a.item, b.item), nullable };
  if (a.kind === "prim" && b.kind === "prim") return { kind: "prim", sqlType: mergePrim(a.sqlType, b.sqlType), nullable };
  if (a.kind === "obj" && b.kind === "obj") {
    const fields = new Map<string, Field>();
    for (const [k, f] of a.fields) {
      const other = b.fields.get(k);
      fields.set(k, other
        ? { shape: mergeShapes(f.shape, other.shape), optional: f.optional || other.optional, xmlKind: f.xmlKind }
        : { ...f, optional: true });
    }
    for (const [k, f] of b.fields) if (!a.fields.has(k)) fields.set(k, { ...f, optional: true });
    return { kind: "obj", fields, nullable };
  }
  // Object vs scalar — no common type
  return { kind: "prim", sqlType: "JSON", nullable };
}

const RE_GUID     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_DATE     = /^\d{4}-\d{2}-\d{2}$/;
const RE_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
const RE_DATETZ   = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

// `fromText`: XML values are always text, so numbers/booleans are detected
// from the string; JSON strings are strings, so only dates/GUIDs are detected.
function inferString(s: string, fromText: boolean): string {
  const v = s.trim();
  if (RE_GUID.test(v))     return "UNIQUEIDENTIFIER";
  if (RE_DATETZ.test(v))   return "TIMESTAMPTZ";
  if (RE_DATETIME.test(v)) return "DATETIME";
  if (RE_DATE.test(v))     return "DATE";
  if (fromText) {
    if (/^(true|false)$/i.test(v)) return "BIT";
    // Leading zeros (zip codes, phone numbers…) must stay strings
    if (/^-?(0|[1-9]\d*)$/.test(v)) return Math.abs(Number(v)) > 2147483647 ? "BIGINT" : "INT";
    if (/^-?(0|[1-9]\d*)\.\d+$/.test(v)) return "FLOAT";
  }
  return "NVARCHAR";
}

function jsonShape(v: unknown): Shape {
  if (v === null || v === undefined) return { kind: "null" };
  if (typeof v === "boolean") return { kind: "prim", sqlType: "BIT" };
  if (typeof v === "number")  return { kind: "prim", sqlType: !Number.isInteger(v) ? "FLOAT" : Math.abs(v) > 2147483647 ? "BIGINT" : "INT" };
  if (typeof v === "string")  return { kind: "prim", sqlType: inferString(v, false) };
  if (Array.isArray(v)) return { kind: "arr", item: v.map(jsonShape).reduce(mergeShapes, { kind: "null" } as Shape) };
  const fields = new Map<string, Field>();
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) fields.set(k, { shape: jsonShape(val), optional: false });
  return { kind: "obj", fields };
}

function xmlShape(el: Element): Shape {
  const fields = new Map<string, Field>();
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === "xmlns" || attr.name.startsWith("xmlns:") || attr.name.startsWith("xsi:")) continue;
    fields.set(attr.name, { shape: { kind: "prim", sqlType: inferString(attr.value, true) }, optional: false, xmlKind: "attr" });
  }
  const groups = new Map<string, Element[]>();
  for (const child of Array.from(el.children)) {
    if (!groups.has(child.tagName)) groups.set(child.tagName, []);
    groups.get(child.tagName)!.push(child);
  }
  for (const [tag, els] of groups) {
    const shapes = els.map(xmlShape);
    const merged = shapes.reduce(mergeShapes);
    fields.set(tag, { shape: els.length > 1 ? { kind: "arr", item: merged } : merged, optional: false, xmlKind: "elem" });
  }
  const text = Array.from(el.childNodes)
    .filter(n => n.nodeType === 3 || n.nodeType === 4)
    .map(n => n.textContent || "").join("").trim();
  if (!fields.size) return text ? { kind: "prim", sqlType: inferString(text, true) } : { kind: "prim", sqlType: "NVARCHAR", nullable: true };
  if (text) fields.set("Value", { shape: { kind: "prim", sqlType: inferString(text, true) }, optional: false, xmlKind: "text" });
  return { kind: "obj", fields };
}

/* ── Shape → classes ─────────────────────────────────────────── */
function toIdentifier(s: string): string {
  const id = s.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "") || "field";
  return /^\d/.test(id) ? `_${id}` : id;
}
function singularize(s: string): string {
  if (/ies$/i.test(s)) return s.slice(0, -3) + "y";
  if (/(ss|x|ch|sh)es$/i.test(s)) return s.slice(0, -2);
  if (/[^s]s$/i.test(s)) return s.slice(0, -1);
  return s;
}

function shapeToTables(root: Shape, rootName: string, rootSrcName: string): ParsedTable[] {
  // Unwrap a top-level array (JSON) — the model describes one item
  while (root.kind === "arr") root = root.item;
  if (root.kind !== "obj") throw new Error("The root value must be an object (or an array of objects).");

  const tables: ParsedTable[] = [];
  const used = new Set<string>();
  const uniqueName = (base: string) => {
    let n = base, i = 2;
    while (used.has(n.toLowerCase())) n = `${base}${i++}`;
    used.add(n.toLowerCase());
    return n;
  };

  const build = (shape: Extract<Shape, { kind: "obj" }>, cls: string, rawCls: string, srcName: string) => {
    const table: ParsedTable = { tableName: cls, rawTableName: rawCls, srcName, columns: [] };
    tables.push(table);
    for (const [key, field] of shape.fields) {
      let s = field.shape, arrayDepth = 0;
      while (s.kind === "arr") { s = s.item; arrayDepth++; }
      const col: Column = {
        name: toIdentifier(key), srcName: key, sqlType: "JSON",
        isNullable: field.optional || !!field.shape.nullable || field.shape.kind === "null",
        isPrimaryKey: false, isAutoIncrement: false, arrayDepth, xmlKind: field.xmlKind,
      };
      if (s.kind === "prim") col.sqlType = s.sqlType;
      if (s.kind === "obj") {
        const childCls = uniqueName(toPascalCase(toIdentifier(arrayDepth ? singularize(key) : key)));
        col.refType = childCls;
        build(s, childCls, childCls, key);
      }
      table.columns.push(col);
    }
    if (!table.columns.length) throw new Error(`"${srcName}" has no fields to generate.`);
  };

  const rawRoot = toIdentifier(rootName);
  used.add(rawRoot.toLowerCase());
  build(root, toPascalCase(rawRoot), rawRoot, rootSrcName);
  return tables;
}

function parseJSON(text: string, rootName: string): ParsedTable[] {
  let data: unknown;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error(`Invalid JSON — ${(e as Error).message}`); }
  return shapeToTables(jsonShape(data), rootName, rootName);
}

function parseXML(text: string): ParsedTable[] {
  const doc = new DOMParser().parseFromString(text.trim(), "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error(`Invalid XML — ${(err.textContent || "").split("\n").filter(Boolean)[0] || "could not parse"}`);
  const root = doc.documentElement;
  const shape = xmlShape(root);
  if (shape.kind !== "obj") throw new Error("The root element has no attributes or child elements to model.");
  return shapeToTables(shape, root.tagName, root.tagName);
}

/* ── Type resolver ───────────────────────────────────────────── */
// Element type, ignoring any list wrapping
function getScalarType(col: Column, lang: string): string {
  if (col.refType) return col.refType;
  const t = col.sqlType;
  // TINYINT(1) → boolean
  if (t === "TINYINT" && col.maxLength === 1) return TM["BOOLEAN"]?.[lang] || "bool";
  // Oracle NUMBER without scale → integer by precision
  if (t === "NUMBER" && col.precision !== undefined && (col.scale === undefined || col.scale === 0)) {
    if (col.precision <= 4)  return TM["SMALLINT"]?.[lang] || "short";
    if (col.precision <= 9)  return TM["INT"]?.[lang]      || "int";
    if (col.precision <= 18) return TM["BIGINT"]?.[lang]   || "long";
  }
  return TM[t]?.[lang] || TM[t]?.default || "object";
}

const JAVA_BOX: Record<string, string> = { int:"Integer", long:"Long", short:"Short", byte:"Byte", boolean:"Boolean", float:"Float", double:"Double" };

function wrapArray(t: string, lang: string): string {
  switch (lang) {
    case "csharp":     return `List<${t}>`;
    case "python":     return `list[${t}]`;
    case "java":       return `List<${JAVA_BOX[t] || t}>`;
    case "go":         return `[]${t}`;
    case "kotlin":     return `List<${t}>`;
    case "swift":      return `[${t}]`;
    case "cpp":        return `std::vector<${t}>`;
    case "rust":       return `Vec<${t}>`;
    default:           return `${t}[]`; // typescript / javascript (JSDoc)
  }
}

function getBaseType(col: Column, lang: string): string {
  let t = getScalarType(col, lang);
  for (let i = 0; i < (col.arrayDepth || 0); i++) t = wrapArray(t, lang);
  return t;
}

function nullable(base: string, col: Column, lang: string): string {
  if (!col.isNullable || col.isPrimaryKey) return base;
  switch (lang) {
    case "csharp":     return `${base}?`;
    case "python":     return `Optional[${base}]`;
    case "java":       return JAVA_BOX[base] || base;
    case "typescript": return `${base} | null`;
    case "javascript": return base; // JS has no type annotations
    case "go":         return base === "bool" ? "*bool" : base.startsWith("[]") ? base : `*${base}`;
    case "kotlin":     return `${base}?`;
    case "swift":      return `${base}?`;
    case "cpp":        return `std::optional<${base}>`;
    case "rust":       return `Option<${base}>`;
    default:           return base;
  }
}

/* ── Code Generators ─────────────────────────────────────────── */
// Every generator receives all classes, root first; nested JSON/XML objects
// become additional classes after it.
interface GenOpts { mode: NamingMode; source: Source }

const className = (t: ParsedTable, mode: NamingMode) => mode === "exact" ? t.rawTableName : t.tableName;
const allColumns = (tables: ParsedTable[]) => tables.flatMap(t => t.columns);
const scalarTypes = (tables: ParsedTable[], lang: string) => new Set(allColumns(tables).map(c => getScalarType(c, lang)));
const hasArrays = (tables: ParsedTable[]) => allColumns(tables).some(c => c.arrayDepth);

function genCSharp(tables: ParsedTable[], { mode, source }: GenOpts): string {
  const cols      = allColumns(tables);
  const needsJson = source === "json" && cols.some(c => convName(c.name, "pascal", mode) !== c.srcName);
  const lines = [
    "using System;",
    ...(hasArrays(tables) ? ["using System.Collections.Generic;"] : []),
    ...(cols.some(c => c.isAutoIncrement) ? ["using System.ComponentModel.DataAnnotations;", "using System.ComponentModel.DataAnnotations.Schema;"] : []),
    ...(needsJson ? ["using System.Text.Json.Serialization;"] : []),
    ...(scalarTypes(tables, "csharp").has("XDocument") ? ["using System.Xml.Linq;"] : []),
    ...(source === "xml" ? ["using System.Xml.Serialization;"] : []),
  ];
  tables.forEach((table, ti) => {
    lines.push("");
    if (source === "xml" && ti === 0) lines.push(`[XmlRoot("${table.srcName}")]`);
    lines.push(`public class ${className(table, mode)}`, "{");
    for (const col of table.columns) {
      const base     = getBaseType(col, "csharp");
      // XmlSerializer cannot write Nullable<T> as an attribute
      const type     = source === "xml" && col.xmlKind === "attr" ? base : nullable(base, col, "csharp");
      const propName = convName(col.name, "pascal", mode);
      if (col.isAutoIncrement) lines.push("    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]");
      if (source === "json" && propName !== col.srcName) lines.push(`    [JsonPropertyName("${col.srcName}")]`);
      if (source === "xml") lines.push(
        col.xmlKind === "attr" ? `    [XmlAttribute("${col.srcName}")]` :
        col.xmlKind === "text" ? "    [XmlText]" : `    [XmlElement("${col.srcName}")]`);
      lines.push(`    public ${type} ${propName} { get; set; }`);
      lines.push("");
    }
    if (lines[lines.length - 1] === "") lines.pop();
    lines.push("}");
  });
  return lines.join("\n");
}

function genPython(tables: ParsedTable[], { mode }: GenOpts): string {
  const imports = new Set<string>(["from dataclasses import dataclass, field", "from typing import Optional"]);
  for (const t of scalarTypes(tables, "python")) {
    if (t === "datetime" || t === "date" || t === "time")  imports.add("from datetime import datetime, date, time");
    if (t === "Decimal") imports.add("from decimal import Decimal");
    if (t === "UUID")    imports.add("from uuid import UUID");
  }
  const lines = [...imports];
  // Nested classes must be defined before the classes that annotate with them
  for (const table of [...tables].reverse()) {
    const hasDefault = (c: Column) => c.isNullable && !c.isPrimaryKey;
    // A field without a default may not follow one with a default unless keyword-only
    const kwOnly = table.columns.some((c, i) => !hasDefault(c) && table.columns.slice(0, i).some(hasDefault));
    lines.push("", "", kwOnly ? "@dataclass(kw_only=True)" : "@dataclass", `class ${className(table, mode)}:`);
    for (const col of table.columns) {
      const base = getBaseType(col, "python");
      const type = nullable(base, col, "python");
      const fieldName = convName(col.name, "snake", mode);
      lines.push(`    ${fieldName}: ${type}${hasDefault(col) ? " = None" : ""}`);
    }
  }
  return lines.join("\n");
}

function genJava(tables: ParsedTable[], { mode, source }: GenOpts): string {
  const cols = allColumns(tables);
  const imports = new Set<string>(source === "sql" ? ["import jakarta.persistence.*;", "import java.io.Serializable;"] : []);
  if (source === "json" && cols.some(c => convName(c.name, "camel", mode) !== c.srcName)) imports.add("import com.fasterxml.jackson.annotation.JsonProperty;");
  if (source === "xml") imports.add("import com.fasterxml.jackson.dataformat.xml.annotation.*;");
  if (hasArrays(tables)) imports.add("import java.util.List;");
  for (const t of scalarTypes(tables, "java")) {
    if (["LocalDateTime", "OffsetDateTime", "LocalDate", "LocalTime", "OffsetTime"].includes(t)) imports.add("import java.time.*;");
    if (t === "BigDecimal") imports.add("import java.math.BigDecimal;");
    if (t === "UUID")       imports.add("import java.util.UUID;");
  }

  const classLines = (table: ParsedTable, isRoot: boolean): string[] => {
    const cls = className(table, mode);
    const lines: string[] = [];
    if (source === "sql") lines.push("@Entity", `@Table(name = "${cls}")`);
    if (source === "xml" && isRoot) lines.push(`@JacksonXmlRootElement(localName = "${table.srcName}")`);
    // Java allows one public top-level class per file, so nested models are static inner classes
    lines.push(isRoot
      ? `public class ${cls}${source === "sql" ? " implements Serializable" : ""} {`
      : `public static class ${cls} {`, "");
    for (const col of table.columns) {
      const type = nullable(getBaseType(col, "java"), col, "java");
      const fieldName = convName(col.name, "camel", mode);
      if (source === "sql") {
        if (col.isPrimaryKey) {
          lines.push("    @Id");
          if (col.isAutoIncrement) lines.push("    @GeneratedValue(strategy = GenerationType.IDENTITY)");
        }
        lines.push(`    @Column(name = "${col.name}"${!col.isNullable ? ", nullable = false" : ""})`);
      }
      if (source === "json" && fieldName !== col.srcName) lines.push(`    @JsonProperty("${col.srcName}")`);
      if (source === "xml") {
        if (col.xmlKind === "text") lines.push("    @JacksonXmlText");
        else {
          if (col.arrayDepth) lines.push("    @JacksonXmlElementWrapper(useWrapping = false)");
          lines.push(`    @JacksonXmlProperty(${col.xmlKind === "attr" ? "isAttribute = true, " : ""}localName = "${col.srcName}")`);
        }
      }
      lines.push(`    private ${type} ${fieldName};`);
      lines.push("");
    }
    // Getters & setters
    for (const col of table.columns) {
      const type = nullable(getBaseType(col, "java"), col, "java");
      const fieldName = convName(col.name, "camel", mode);
      const pascal    = convName(col.name, "pascal", mode);
      lines.push(`    public ${type} get${pascal}() { return ${fieldName}; }`);
      lines.push(`    public void set${pascal}(${type} ${fieldName}) { this.${fieldName} = ${fieldName}; }`);
      lines.push("");
    }
    if (lines[lines.length - 1] === "") lines.pop();
    return lines;
  };

  const [root, ...nested] = tables;
  const lines = [...imports, ...(imports.size ? [""] : []), ...classLines(root, true)];
  for (const table of nested) lines.push("", ...classLines(table, false).map(l => l ? `    ${l}` : l), "    }");
  lines.push("}");
  return lines.join("\n");
}

function genTypeScript(tables: ParsedTable[], { mode, source }: GenOpts): string {
  const lines: string[] = [];
  tables.forEach((table, ti) => {
    if (ti) lines.push("");
    lines.push(`export interface ${className(table, mode)} {`);
    for (const col of table.columns) {
      const base = getBaseType(col, "typescript");
      const opt  = col.isNullable && !col.isPrimaryKey;
      const fieldName = convName(col.name, "camel", mode);
      lines.push(`    ${fieldName}${opt ? "?" : ""}: ${opt ? `${base} | null` : base};`);
    }
    lines.push("}");
  });
  if (source === "sql") {
    const [{ columns }] = tables;
    const cls = className(tables[0], mode);
    const keyField = convName(columns.find(c => c.isPrimaryKey || c.isAutoIncrement)?.name || "id", "camel", mode);
    lines.push("", `export type Create${cls} = Omit<${cls}, '${keyField}' >;`);
    lines.push(`export type Update${cls} = Partial<${cls}> & Pick<${cls}, '${keyField}' >;`);
  }
  return lines.join("\n");
}

function genJavaScript(tables: ParsedTable[], { mode }: GenOpts): string {
  const lines: string[] = [];
  for (const table of tables) {
    const fields = table.columns.map(col => {
      const fieldName = convName(col.name, "camel", mode);
      const t = col.sqlType;
      const defVal =
        col.arrayDepth ? "[]" :
        col.isNullable ? "null" :
        col.refType    ? `new ${col.refType}()` :
        t === "JSON"   ? "null" :
        t.includes("INT") || t.includes("FLOAT") || t.includes("DECIMAL") || t.includes("NUMBER") ? "0" :
        t.includes("BIT") || t.includes("BOOL") ? "false" :
        t.includes("DATE") || t.includes("TIME") ? "new Date()" : '""';
      return `        /** @type {${getBaseType(col, "typescript")}} */\n        this.${fieldName} = ${defVal};`;
    });
    lines.push(`class ${className(table, mode)} {`, `    constructor() {`, ...fields, `    }`, `}`, "");
  }
  const names = tables.map(t => className(t, mode));
  lines.push(names.length === 1 ? `module.exports = ${names[0]};` : `module.exports = { ${names.join(", ")} };`);
  return lines.join("\n");
}

function genGo(tables: ParsedTable[], { mode, source }: GenOpts): string {
  const scalars = scalarTypes(tables, "go");
  const imports = [
    ...(source === "xml" ? ['"encoding/xml"'] : []),
    ...(scalars.has("time.Time") || scalars.has("time.Duration") ? ['"time"'] : []),
  ];
  const lines = ["package models", ""];
  if (imports.length === 1) lines.push(`import ${imports[0]}`, "");
  if (imports.length > 1)   lines.push("import (", ...imports.map(i => `    ${i}`), ")", "");
  tables.forEach((table, ti) => {
    if (ti) lines.push("");
    lines.push(`type ${className(table, mode)} struct {`);
    if (source === "xml" && ti === 0) lines.push(`    ${"XMLName".padEnd(20)} ${"xml.Name".padEnd(16)} \`xml:"${table.srcName}"\``);
    for (const col of table.columns) {
      const base = getBaseType(col, "go");
      const type = nullable(base, col, "go");
      // Go requires an uppercase first letter to export a struct field (needed
      // for encoding/json etc.), so in "exact" mode we only capitalize the
      // first letter and otherwise leave the rest of the name untouched.
      const fieldName = mode === "exact"
        ? (col.name.charAt(0).toUpperCase() + col.name.slice(1))
        : toPascalCase(col.name);
      const tag =
        source === "sql"  ? `db:"${col.name}" json:"${convName(col.name, "camel", mode)}"` :
        source === "json" ? `json:"${col.srcName}"` :
        col.xmlKind === "attr" ? `xml:"${col.srcName},attr"` :
        col.xmlKind === "text" ? `xml:",chardata"` : `xml:"${col.srcName}"`;
      lines.push(`    ${fieldName.padEnd(20)} ${type.padEnd(16)} \`${tag}\``);
    }
    lines.push("}");
  });
  return lines.join("\n");
}

function genKotlin(tables: ParsedTable[], { mode }: GenOpts): string {
  const imports = new Set<string>();
  for (const t of scalarTypes(tables, "kotlin")) {
    if (t === "LocalDateTime" || t === "LocalDate" || t === "LocalTime" || t === "OffsetDateTime" || t === "OffsetTime") imports.add("import java.time.*");
    if (t === "BigDecimal") imports.add("import java.math.BigDecimal");
    if (t === "UUID") imports.add("import java.util.UUID");
  }
  const lines = [...imports];
  tables.forEach(table => {
    if (lines.length) lines.push("");
    lines.push(`data class ${className(table, mode)}(`);
    table.columns.forEach((col, i) => {
      const type = nullable(getBaseType(col, "kotlin"), col, "kotlin");
      const fieldName = convName(col.name, "camel", mode);
      const comma = i < table.columns.length - 1 ? "," : "";
      const defVal = col.isNullable && !col.isPrimaryKey ? " = null" : "";
      lines.push(`    val ${fieldName}: ${type}${defVal}${comma}`);
    });
    lines.push(")");
  });
  return lines.join("\n");
}

function genSwift(tables: ParsedTable[], { mode }: GenOpts): string {
  const scalars = scalarTypes(tables, "swift");
  const lines = ["Date", "UUID", "Data", "Decimal"].some(t => scalars.has(t)) ? ["import Foundation"] : [];
  for (const table of tables) {
    if (lines.length) lines.push("");
    lines.push(`struct ${className(table, mode)}: Codable {`);
    const codingKeys: string[] = [];
    for (const col of table.columns) {
      const type = nullable(getBaseType(col, "swift"), col, "swift");
      const fieldName = convName(col.name, "camel", mode);
      lines.push(`    let ${fieldName}: ${type}`);
      codingKeys.push(fieldName !== col.srcName ? `        case ${fieldName} = "${col.srcName}"` : `        case ${fieldName}`);
    }
    // CodingKeys must list every property once any of them is renamed
    if (table.columns.some(c => convName(c.name, "camel", mode) !== c.srcName)) {
      lines.push("", "    enum CodingKeys: String, CodingKey {", ...codingKeys, "    }");
    }
    lines.push("}");
  }
  return lines.join("\n");
}

function genCpp(tables: ParsedTable[], { mode }: GenOpts): string {
  const cols = allColumns(tables);
  const needsOptional = cols.some(c => c.isNullable && !c.isPrimaryKey);
  const needsVector   = hasArrays(tables) || scalarTypes(tables, "cpp").has("std::vector<uint8_t>");
  const lines = [
    "#pragma once",
    "#include <string>",
    "#include <cstdint>",
    ...(needsOptional ? ["#include <optional>"] : []),
    ...(needsVector   ? ["#include <vector>"] : []),
  ];
  // A struct must be defined before another struct can hold it by value
  for (const table of [...tables].reverse()) {
    lines.push("", `struct ${className(table, mode)} {`);
    for (const col of table.columns) {
      const base = getBaseType(col, "cpp");
      const type = nullable(base, col, "cpp");
      const fieldName = convName(col.name, "snake", mode);
      const defVal = col.isNullable && !col.isPrimaryKey ? "" : col.refType || base === "std::string" || base.includes("vector") ? "" : base === "bool" ? "{ false }" : "{}";
      lines.push(`    ${type.padEnd(30)} ${fieldName}${defVal};`);
    }
    lines.push("};");
  }
  return lines.join("\n");
}

function genRust(tables: ParsedTable[], { mode, source }: GenOpts): string {
  const scalars = scalarTypes(tables, "rust");
  const lines = [
    ...(["NaiveDateTime","NaiveDate","NaiveTime","DateTime<Utc>"].some(t => scalars.has(t)) ? ["use chrono::{NaiveDateTime, NaiveDate, NaiveTime, DateTime, Utc};"] : []),
    ...(scalars.has("Uuid")              ? ["use uuid::Uuid;"] : []),
    ...(scalars.has("serde_json::Value") ? ["use serde_json;"] : []),
    "use serde::{Deserialize, Serialize};",
  ];
  for (const table of tables) {
    lines.push("", "#[derive(Debug, Clone, Serialize, Deserialize)]");
    if (source === "sql" && mode === "convention") lines.push("#[serde(rename_all = \"snake_case\")]");
    lines.push(`pub struct ${className(table, mode)} {`);
    for (const col of table.columns) {
      const type = nullable(getBaseType(col, "rust"), col, "rust");
      const fieldName = convName(col.name, "snake", mode);
      if (source === "sql") {
        if (mode === "convention") {
          if (fieldName !== toSnakeCase(toPascalCase(col.name))) lines.push(`    #[serde(rename = "${col.name}")]`);
        } else if (fieldName !== col.name) {
          // "exact" identifiers should already match, but guard just in case
          lines.push(`    #[serde(rename = "${col.name}")]`);
        }
      } else {
        // quick-xml's serde convention: "@name" for attributes, "$text" for element text
        const wire = col.xmlKind === "attr" ? `@${col.srcName}` : col.xmlKind === "text" ? "$text" : col.srcName;
        if (fieldName !== wire) lines.push(`    #[serde(rename = "${wire}")]`);
      }
      lines.push(`    pub ${fieldName}: ${type},`);
    }
    lines.push("}");
  }
  return lines.join("\n");
}

function generateCode(tables: ParsedTable[], lang: string, opts: GenOpts): string {
  switch (lang) {
    case "csharp":     return genCSharp(tables, opts);
    case "python":     return genPython(tables, opts);
    case "java":       return genJava(tables, opts);
    case "typescript": return genTypeScript(tables, opts);
    case "javascript": return genJavaScript(tables, opts);
    case "go":         return genGo(tables, opts);
    case "kotlin":     return genKotlin(tables, opts);
    case "swift":      return genSwift(tables, opts);
    case "cpp":        return genCpp(tables, opts);
    case "rust":       return genRust(tables, opts);
    default:           return "// Unsupported language";
  }
}

/* ── Samples ──────────────────────────────────────────────────── */
const SAMPLES: Record<string, string> = {
  sqlserver: `CREATE TABLE [dbo].[Users] (
    [UserId]       INT             IDENTITY(1,1)  NOT NULL,
    [Username]     NVARCHAR(100)                  NOT NULL,
    [Email]        NVARCHAR(255)                  NOT NULL,
    [PasswordHash] NVARCHAR(512)                  NOT NULL,
    [FirstName]    NVARCHAR(50)                   NULL,
    [LastName]     NVARCHAR(50)                   NULL,
    [DateOfBirth]  DATE                           NULL,
    [CreatedAt]    DATETIME2                      NOT NULL,
    [UpdatedAt]    DATETIME2                      NULL,
    [IsActive]     BIT                            NOT NULL,
    [Balance]      DECIMAL(18,2)                  NOT NULL,
    [ProfileImage] VARBINARY(MAX)                 NULL,
    [UniqueCode]   UNIQUEIDENTIFIER               NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([UserId])
);`,
  mysql: `CREATE TABLE users (
    user_id       INT           AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  NOT NULL,
    password_hash VARCHAR(512)  NOT NULL,
    first_name    VARCHAR(50)   NULL,
    last_name     VARCHAR(50)   NULL,
    date_of_birth DATE          NULL,
    created_at    DATETIME      NOT NULL,
    updated_at    DATETIME      NULL,
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    balance       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    profile_image LONGBLOB      NULL
);`,
  postgresql: `CREATE TABLE users (
    user_id       SERIAL                  PRIMARY KEY,
    username      VARCHAR(100)            NOT NULL,
    email         VARCHAR(255)            NOT NULL,
    password_hash TEXT                    NOT NULL,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    date_of_birth DATE,
    created_at    TIMESTAMP               NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ,
    is_active     BOOLEAN                 NOT NULL DEFAULT TRUE,
    balance       NUMERIC(18,2)           NOT NULL DEFAULT 0,
    profile_image BYTEA,
    unique_code   UUID
);`,
  oracle: `CREATE TABLE USERS (
    USER_ID       NUMBER(10)    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    USERNAME      VARCHAR2(100) NOT NULL,
    EMAIL         VARCHAR2(255) NOT NULL,
    PASSWORD_HASH VARCHAR2(512) NOT NULL,
    FIRST_NAME    VARCHAR2(50),
    LAST_NAME     VARCHAR2(50),
    DATE_OF_BIRTH DATE,
    CREATED_AT    TIMESTAMP     NOT NULL,
    UPDATED_AT    TIMESTAMP,
    IS_ACTIVE     NUMBER(1)     NOT NULL,
    BALANCE       NUMBER(18,2)  NOT NULL,
    PROFILE_IMAGE BLOB
);`,
  sqlite: `CREATE TABLE users (
    user_id       INTEGER  PRIMARY KEY AUTOINCREMENT,
    username      TEXT     NOT NULL,
    email         TEXT     NOT NULL,
    password_hash TEXT     NOT NULL,
    first_name    TEXT,
    last_name     TEXT,
    date_of_birth TEXT,
    created_at    TEXT     NOT NULL,
    is_active     INTEGER  NOT NULL DEFAULT 1,
    balance       REAL     NOT NULL DEFAULT 0
);`,
};

const JSON_SAMPLE = `{
  "userId": 1024,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "isActive": true,
  "balance": 1520.75,
  "createdAt": "2026-03-14T09:26:53Z",
  "dateOfBirth": "1994-08-21",
  "uniqueCode": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "middleName": null,
  "tags": ["admin", "beta"],
  "address": {
    "street": "221B Baker Street",
    "city": "London",
    "zip": "NW1 6XE"
  },
  "orders": [
    { "orderId": 1, "total": 49.99, "items": [{ "sku": "A-100", "qty": 2 }] },
    { "orderId": 2, "total": 15, "note": "gift", "items": [] }
  ]
}`;

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Customer id="1024" status="active">
  <Name>Jane Doe</Name>
  <Email>jane@example.com</Email>
  <IsVip>true</IsVip>
  <CreatedAt>2026-03-14T09:26:53</CreatedAt>
  <Address type="billing">
    <Street>221B Baker Street</Street>
    <City>London</City>
    <Zip>01234</Zip>
  </Address>
  <Order number="A-1">
    <Total currency="USD">49.99</Total>
    <Item sku="A-100" qty="2" />
  </Order>
  <Order number="A-2">
    <Total currency="EUR">15.00</Total>
    <Item sku="B-200" qty="1" />
    <Item sku="C-300" qty="4" />
  </Order>
</Customer>`;

const PLACEHOLDERS: Record<Source, string> = {
  sql:  `Paste your CREATE TABLE SQL here…\n\nExample:\nCREATE TABLE [dbo].[Users] (\n    [UserId]   INT IDENTITY(1,1) NOT NULL,\n    [Username] NVARCHAR(100)     NOT NULL,\n    …\n);`,
  json: `Paste a JSON object or array here…\n\nExample:\n{\n  "id": 1,\n  "name": "Jane",\n  "address": { "city": "London" }\n}`,
  xml:  `Paste an XML document here…\n\nExample:\n<Customer id="1">\n  <Name>Jane</Name>\n  <Address><City>London</City></Address>\n</Customer>`,
};

/* ── Component ──────────────────────────────────────────────── */
export default function ModelGenerator() {
  const [source,   setSource]   = useState<Source>("sql");
  const [dialect,  setDialect]  = useState("sqlserver");
  const [lang,     setLang]     = useState("csharp");
  const [mode,     setMode]     = useState<NamingMode>("exact");
  const [rootName, setRootName] = useState("Root");
  // Each source keeps its own input so switching tabs doesn't lose work
  const [inputs,   setInputs]   = useState<Record<Source, string>>({ sql: "", json: "", xml: "" });
  const [output,   setOutput]   = useState("");
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState(false);

  const input        = inputs[source];
  const setInput     = (v: string) => setInputs(prev => ({ ...prev, [source]: v }));
  const selectedLang = TARGET_LANGS.find(l => l.value === lang)!;
  const selectedSrc  = SOURCES.find(s => s.value === source)!;

  const switchSource = (s: Source) => { setSource(s); setOutput(""); setError(""); };

  const convert = () => {
    setError(""); setOutput("");
    try {
      const tables =
        source === "sql"  ? [parseSQL(input)] :
        source === "json" ? parseJSON(input, rootName.trim() || "Root") :
                            parseXML(input);
      setOutput(generateCode(tables, lang, { mode, source }));
    } catch (e) {
      setError(String(e).replace("Error: ", ""));
    }
  };

  const loadSample = () => {
    setInput(source === "sql" ? SAMPLES[dialect] || "" : source === "json" ? JSON_SAMPLE : XML_SAMPLE);
    setOutput(""); setError("");
  };

  const copyOutput = async () => {
    try { await navigator.clipboard.writeText(output); } catch { /**/ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `model.${selectedLang.ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const accent = "#2563eb";
  const glow   = "rgba(37,99,235,0.25)";
  const labelStyle  = { fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:5 } as const;
  const selectStyle = { padding:"8px 14px", borderRadius:9, border:"1.5px solid rgba(37,99,235,0.3)", fontSize:13, fontWeight:600, color:"#0f0a1e", background:"#fff", cursor:"pointer", outline:"none" } as const;

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <section style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe 30%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2" style={{ color:accent }}>Developer Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#2563eb,#1d4ed8)" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          Model <span style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Generator</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:660 }}>
          Paste a <strong>CREATE TABLE</strong> statement, a <strong>JSON</strong> sample or an <strong>XML</strong> document and instantly generate typed model classes in C#, Python, Java, TypeScript, Go, Kotlin, Swift, C++ or Rust. Nested objects become their own classes.
        </p>
      </section>

      <div style={{ width:"100%", padding:"20px 40px 48px", flex:1, boxSizing:"border-box", maxWidth:1280, margin:"0 auto" }}>

        {/* Source tabs */}
        <div style={{ display:"inline-flex", gap:4, padding:4, borderRadius:11, background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.15)", marginBottom:16 }}>
          {SOURCES.map(s => {
            const active = s.value === source;
            return (
              <button
                key={s.value}
                onClick={() => switchSource(s.value)}
                style={{ padding:"7px 20px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", border:"none",
                  background: active ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "transparent",
                  color: active ? "#fff" : accent, boxShadow: active ? `0 2px 8px ${glow}` : "none" }}
              >
                {s.label} → Model
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:18, alignItems:"flex-end" }}>
          {source === "sql" && (
            <div>
              <label style={labelStyle}>Source Database</label>
              <select value={dialect} onChange={e => setDialect(e.target.value)} style={selectStyle}>
                {SQL_DIALECTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}

          {source === "json" && (
            <div>
              <label style={labelStyle}>Root Class Name</label>
              <input
                value={rootName} onChange={e => setRootName(e.target.value)} placeholder="Root" spellCheck={false}
                style={{ ...selectStyle, cursor:"text", width:160 }}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Target Language</label>
            <select value={lang} onChange={e => setLang(e.target.value)} style={selectStyle}>
              {TARGET_LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Naming</label>
            <select
              value={mode} onChange={e => setMode(e.target.value as NamingMode)} style={selectStyle}
              title="Exact: keep names exactly as written in the source. Convention: re-case names to each language's usual style."
            >
              <option value="exact">Match source exactly</option>
              <option value="convention">Language convention</option>
            </select>
          </div>

          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"flex-end" }}>
            <button onClick={loadSample} style={{ padding:"8px 16px", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(37,99,235,0.07)", color:accent, border:"1.5px solid rgba(37,99,235,0.2)" }}>
              Load Example
            </button>
            <button
              onClick={convert}
              disabled={!input.trim()}
              style={{ padding:"9px 24px", borderRadius:9, fontSize:13, fontWeight:700, cursor:input.trim()?"pointer":"not-allowed", background:`linear-gradient(135deg,#2563eb,#1d4ed8)`, color:"#fff", border:"none", boxShadow:`0 4px 14px ${glow}`, opacity:input.trim()?1:0.5 }}
            >
              Convert →
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(225,29,72,0.05)", border:"1px solid rgba(225,29,72,0.2)", fontSize:13, color:"#e11d48", marginBottom:14 }}>
            <strong>✕ Parse error:</strong> {error}
          </div>
        )}

        {/* Two-panel editor */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          {/* Source Input */}
          <div>
            <label style={{ ...labelStyle, marginBottom:6 }}>
              {selectedSrc.inputLabel}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={PLACEHOLDERS[source]}
              spellCheck={false}
              style={{
                width:"100%", height:480, padding:"16px", borderRadius:12, resize:"vertical",
                border:"1.5px solid rgba(37,99,235,0.2)", background:"#f8faff",
                fontFamily:"'Cascadia Code','Fira Code',monospace", fontSize:12.5, lineHeight:1.65,
                color:"#0f0a1e", outline:"none", boxSizing:"border-box",
              }}
            />
          </div>

          {/* Generated Code */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ ...labelStyle, marginBottom:0 }}>
                Generated {selectedLang.label} Model
              </label>
              {output && (
                <div style={{ display:"flex", gap:6 }}>
                  <button
                    onClick={copyOutput}
                    style={{ padding:"4px 12px", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", background:copied?"rgba(5,150,105,0.08)":"rgba(37,99,235,0.07)", color:copied?"#059669":accent, border:`1px solid ${copied?"rgba(5,150,105,0.2)":"rgba(37,99,235,0.2)"}` }}
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={download}
                    style={{ padding:"4px 12px", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", background:"rgba(37,99,235,0.07)", color:accent, border:"1px solid rgba(37,99,235,0.2)" }}
                  >
                    ⬇ .{selectedLang.ext}
                  </button>
                </div>
              )}
            </div>
            <textarea
              readOnly
              value={output || (error ? "" : `// Generated code will appear here…\n// Paste your ${selectedSrc.label} on the left and click Convert →`)}
              spellCheck={false}
              style={{
                width:"100%", height:480, padding:"16px", borderRadius:12, resize:"vertical",
                border:"1.5px solid rgba(37,99,235,0.15)", background: output ? "#f0f4ff" : "#fafafa",
                fontFamily:"'Cascadia Code','Fira Code',monospace", fontSize:12.5, lineHeight:1.65,
                color: output ? "#0f172a" : "rgba(15,10,30,0.3)", outline:"none", boxSizing:"border-box",
              }}
            />
          </div>
        </div>

        {/* Feature chips */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:16 }}>
          {["SQL Server","MySQL","PostgreSQL","Oracle","SQLite","JSON","XML"].map(d => (
            <span key={d} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.15)", color:"#1d4ed8", fontWeight:600 }}>{d}</span>
          ))}
          <span style={{ fontSize:11, padding:"4px 6px", color:"rgba(15,10,30,0.3)", fontWeight:700 }}>→</span>
          {["C#","Python","Java","TypeScript","Go","Kotlin","Swift","C++","Rust","JS"].map(l => (
            <span key={l} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, background:"rgba(5,150,105,0.07)", border:"1px solid rgba(5,150,105,0.15)", color:"#047857", fontWeight:600 }}>{l}</span>
          ))}
        </div>

        <div style={{ marginTop:36 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:accent, textDecoration:"none" }}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{ borderTop:"1px solid rgba(37,99,235,0.1)", fontSize:13, color:"rgba(15,10,30,0.35)" }}>
        <p>© 2026 iNeedTools · Model Generator</p>
      </footer>
    </div>
  );
}
