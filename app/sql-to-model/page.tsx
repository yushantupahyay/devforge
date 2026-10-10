"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

/* ── Source Formats & Target Languages ───────────────────────── */

const SQL_DIALECTS = [
  { value: "sqlserver",  label: "SQL Server / SSMS / T-SQL" },
  { value: "mysql",      label: "MySQL / MariaDB"           },
  { value: "postgresql", label: "PostgreSQL"                },
  { value: "oracle",     label: "Oracle"                    },
  { value: "sqlite",     label: "SQLite"                    },
  { value: "json",       label: "JSON"                      },
  { value: "xml",        label: "XML"                       },
];

const TARGET_LANGS = [
  { value: "csharp",     label: "C#",         ext: "cs"    },
  { value: "python",     label: "Python",     ext: "py"    },
  { value: "java",       label: "Java",       ext: "java"  },
  { value: "typescript", label: "TypeScript", ext: "ts"    },
  { value: "javascript", label: "JavaScript", ext: "js"    },
  { value: "go",         label: "Go",         ext: "go"    },
  { value: "kotlin",     label: "Kotlin",     ext: "kt"    },
  { value: "swift",      label: "Swift",      ext: "swift" },
  { value: "cpp",        label: "C++",        ext: "hpp"   },
  { value: "rust",       label: "Rust",       ext: "rs"    },
];

type NamingMode = "exact" | "convention";

/* ── Type Mapping ────────────────────────────────────────────── */
type TypeMap = Record<string, string> & { default: string };
const TM: Record<string, TypeMap> = {
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
  DECIMAL:      { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  NUMERIC:      { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  NUMBER:       { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  MONEY:        { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  SMALLMONEY:   { default:"decimal", csharp:"decimal",     python:"Decimal",   java:"BigDecimal",      typescript:"number",    javascript:"number",  go:"float64",  kotlin:"BigDecimal",    swift:"Decimal",  cpp:"double",               rust:"f64"              },
  FLOAT:        { default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  FLOAT4:       { default:"float",   csharp:"float",       python:"float",     java:"float",           typescript:"number",    javascript:"number",  go:"float32",  kotlin:"Float",         swift:"Float",    cpp:"float",                rust:"f32"              },
  FLOAT8:       { default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  REAL:         { default:"float",   csharp:"float",       python:"float",     java:"float",           typescript:"number",    javascript:"number",  go:"float32",  kotlin:"Float",         swift:"Float",    cpp:"float",                rust:"f32"              },
  DOUBLE:       { default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  "DOUBLE PRECISION": { default:"double", csharp:"double", python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
  BINARY_FLOAT: { default:"float",   csharp:"float",       python:"float",     java:"float",           typescript:"number",    javascript:"number",  go:"float32",  kotlin:"Float",         swift:"Float",    cpp:"float",                rust:"f32"              },
  BINARY_DOUBLE:{ default:"double",  csharp:"double",      python:"float",     java:"double",          typescript:"number",    javascript:"number",  go:"float64",  kotlin:"Double",        swift:"Double",   cpp:"double",               rust:"f64"              },
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
  BIT:          { default:"bool",    csharp:"bool",        python:"bool",      java:"boolean",         typescript:"boolean",   javascript:"boolean", go:"bool",     kotlin:"Boolean",       swift:"Bool",     cpp:"bool",                 rust:"bool"             },
  BOOLEAN:      { default:"bool",    csharp:"bool",        python:"bool",      java:"boolean",         typescript:"boolean",   javascript:"boolean", go:"bool",     kotlin:"Boolean",       swift:"Bool",     cpp:"bool",                 rust:"bool"             },
  BOOL:         { default:"bool",    csharp:"bool",        python:"bool",      java:"boolean",         typescript:"boolean",   javascript:"boolean", go:"bool",     kotlin:"Boolean",       swift:"Bool",     cpp:"bool",                 rust:"bool"             },
  DATETIME:     { default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  DATETIME2:    { default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  SMALLDATETIME:{ default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  TIMESTAMP:    { default:"DateTime",csharp:"DateTime",    python:"datetime",  java:"LocalDateTime",   typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"LocalDateTime", swift:"Date",     cpp:"std::string",          rust:"NaiveDateTime"    },
  TIMESTAMPTZ:  { default:"DateTime",csharp:"DateTimeOffset",python:"datetime",java:"OffsetDateTime",  typescript:"Date",      javascript:"Date",    go:"time.Time",kotlin:"OffsetDateTime",swift:"Date",     cpp:"std::string",          rust:"DateTime<Utc>"    },
  DATE:         { default:"DateOnly",csharp:"DateOnly",    python:"date",      java:"LocalDate",       typescript:"string",    javascript:"string",  go:"time.Time",kotlin:"LocalDate",     swift:"Date",     cpp:"std::string",          rust:"NaiveDate"        },
  TIME:         { default:"TimeOnly",csharp:"TimeOnly",    python:"time",      java:"LocalTime",       typescript:"string",    javascript:"string",  go:"time.Duration",kotlin:"LocalTime", swift:"Date",     cpp:"std::string",          rust:"NaiveTime"        },
  TIMETZ:       { default:"TimeOnly",csharp:"TimeOnly",    python:"time",      java:"OffsetTime",      typescript:"string",    javascript:"string",  go:"time.Duration",kotlin:"OffsetTime",swift:"Date",     cpp:"std::string",          rust:"NaiveTime"        },
  YEAR:         { default:"int",     csharp:"int",         python:"int",       java:"int",             typescript:"number",    javascript:"number",  go:"int32",    kotlin:"Int",           swift:"Int",      cpp:"int32_t",              rust:"i32"              },
  UNIQUEIDENTIFIER: { default:"Guid",csharp:"Guid",        python:"UUID",      java:"UUID",            typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"UUID",     cpp:"std::string",          rust:"Uuid"             },
  UUID:         { default:"Guid",    csharp:"Guid",        python:"UUID",      java:"UUID",            typescript:"string",    javascript:"string",  go:"string",   kotlin:"String",        swift:"UUID",     cpp:"std::string",          rust:"Uuid"             },
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
function convName(raw: string, style: "pascal" | "camel" | "snake", mode: NamingMode): string {
  if (mode === "exact") return raw;
  if (style === "pascal") return toPascalCase(raw);
  if (style === "camel")  return toCamelCase(raw);
  return toSnakeCase(raw);
}

/* ── Parsed model ────────────────────────────────────────────── */
interface Column {
  name: string;
  sqlType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}
interface ParsedTable {
  tableName: string;
  rawTableName: string;
  columns: Column[];
}

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
  if (!trimmed || /^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|KEY\s|CHECK\s*\()/i.test(trimmed)) return null;

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

  const typeMatch = rest.match(/^[\["`]?([\w ]+?)[\]"`]?(?:\s*\(([^)]*)\))?(?:\s|$)/);
  if (!typeMatch) return null;
  const rawType = typeMatch[1].trim().toUpperCase();
  const params  = typeMatch[2] ? typeMatch[2].split(",").map(p => p.trim()) : [];
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

  return { name, sqlType: rawType, isNullable, isPrimaryKey, isAutoIncrement, maxLength, precision, scale };
}

function parseSQL(sql: string): ParsedTable {
  const s = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
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
  return { tableName, rawTableName: cleanRawName, columns };
}

/* ── JSON Parser ─────────────────────────────────────────────── */
function inferJsonType(val: unknown): string {
  if (val === null) return "JSON";
  if (typeof val === "boolean") return "BOOLEAN";
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      if (val >= -2147483648 && val <= 2147483647) return "INT";
      return "BIGINT";
    }
    return "FLOAT";
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) return "DATETIME";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return "DATE";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return "UUID";
    return "VARCHAR";
  }
  return "JSON";
}

function parseJSON(jsonStr: string): ParsedTable {
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("Invalid JSON: " + (e as Error).message);
  }

  if (Array.isArray(data)) {
    if (!data.length) throw new Error("JSON array is empty. Please provide at least one object.");
    data = data[0];
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("JSON must be an object or an array of objects.");
  }

  let tableName = "Root";
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 1) {
    const only = obj[keys[0]];
    if (Array.isArray(only) && only.length > 0 && typeof only[0] === "object" && only[0] !== null) {
      tableName = keys[0];
      data = only[0];
    } else if (typeof only === "object" && only !== null && !Array.isArray(only)) {
      tableName = keys[0];
      data = only;
    }
  }

  const cleanRawName = tableName.replace(/[^a-zA-Z0-9_]/g, "_");
  const pascalName = toPascalCase(cleanRawName);

  const columns: Column[] = [];
  const finalObj = data as Record<string, unknown>;
  for (const [key, val] of Object.entries(finalObj)) {
    const sqlType = inferJsonType(val);
    const isNullable = val === null;
    const lower = key.toLowerCase();
    const isId = lower === "id" || lower === `${cleanRawName.toLowerCase()}_id` || lower === `${cleanRawName.toLowerCase()}id`;
    columns.push({
      name: key,
      sqlType,
      isNullable,
      isPrimaryKey: isId,
      isAutoIncrement: false,
    });
  }

  if (!columns.length) throw new Error("No properties found in the JSON object.");
  return { tableName: pascalName, rawTableName: cleanRawName, columns };
}

/* ── XML Parser ──────────────────────────────────────────────── */
function inferXmlType(text: string): string {
  const t = text.trim();
  if (/^-?\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return n >= -2147483648 && n <= 2147483647 ? "INT" : "BIGINT";
  }
  if (/^-?\d*\.\d+$/.test(t)) return "DECIMAL";
  if (/^(true|false)$/i.test(t)) return "BOOLEAN";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(t)) return "DATETIME";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return "DATE";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return "UUID";
  return "VARCHAR";
}

function widenType(a: string, b: string): string {
  if (a === b) return a;
  const order = ["INT", "BIGINT", "DECIMAL", "FLOAT"];
  if (order.includes(a) && order.includes(b)) {
    return order[Math.max(order.indexOf(a), order.indexOf(b))];
  }
  if (a === "VARCHAR" || b === "VARCHAR") return "VARCHAR";
  return a;
}

function parseXML(xmlStr: string): ParsedTable {
  if (typeof DOMParser === "undefined") {
    throw new Error("XML parsing is only available in the browser.");
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML: " + (parseError.textContent || "").slice(0, 200));
  }

  const root = doc.documentElement;
  if (!root) throw new Error("XML document has no root element.");

  let recordNode: Element = root;
  const elementChildren = Array.from(root.children);
  if (elementChildren.length === 1 && elementChildren[0].children.length > 0) {
    recordNode = elementChildren[0];
  }

  const rows = Array.from(recordNode.children);
  if (!rows.length) throw new Error("XML contains no child elements to convert into columns.");

  const fieldMap = new Map<string, { type: string; nullable: boolean }>();
  for (const row of rows) {
    for (const child of Array.from(row.children)) {
      const key = child.tagName;
      const text = (child.textContent || "").trim();
      const type = inferXmlType(text);
      const existing = fieldMap.get(key);
      if (!existing) {
        fieldMap.set(key, { type, nullable: false });
      } else {
        existing.type = widenType(existing.type, type);
      }
    }
  }

  const cleanRawName = (root.tagName || "Root").replace(/[^a-zA-Z0-9_]/g, "_") || "Root";
  const pascalName = toPascalCase(cleanRawName);

  const columns: Column[] = [];
  for (const [key, info] of fieldMap) {
    const lower = key.toLowerCase();
    const isId = lower === "id" || lower === `${cleanRawName.toLowerCase()}_id` || lower === `${cleanRawName.toLowerCase()}id`;
    columns.push({
      name: key,
      sqlType: info.type,
      isNullable: info.nullable,
      isPrimaryKey: isId,
      isAutoIncrement: false,
    });
  }

  if (!columns.length) throw new Error("No fields found in the XML data.");
  return { tableName: pascalName, rawTableName: cleanRawName, columns };
}

/* ── Unified parser ──────────────────────────────────────────── */
function parseInput(input: string, dialect: string): ParsedTable {
  if (dialect === "json") return parseJSON(input);
  if (dialect === "xml")  return parseXML(input);
  return parseSQL(input);
}

/* ── Type resolver ───────────────────────────────────────────── */
function getBaseType(col: Column, lang: string): string {
  const t = col.sqlType;
  if (t === "TINYINT" && col.maxLength === 1) return TM["BOOLEAN"]?.[lang] || "bool";
  if (t === "NUMBER" && col.precision !== undefined && (col.scale === undefined || col.scale === 0)) {
    if (col.precision <= 4)  return TM["SMALLINT"]?.[lang] || "short";
    if (col.precision <= 9)  return TM["INT"]?.[lang]      || "int";
    if (col.precision <= 18) return TM["BIGINT"]?.[lang]   || "long";
  }
  return TM[t]?.[lang] || TM[t]?.default || "object";
}

function nullable(base: string, col: Column, lang: string): string {
  if (!col.isNullable || col.isPrimaryKey) return base;
  switch (lang) {
    case "csharp":     return `${base}?`;
    case "python":     return `Optional[${base}]`;
    case "java":
      if (base === "int")     return "Integer";
      if (base === "long")    return "Long";
      if (base === "short")   return "Short";
      if (base === "byte")    return "Byte";
      if (base === "boolean") return "Boolean";
      if (base === "float")   return "Float";
      if (base === "double")  return "Double";
      return base;
    case "typescript": return `${base} | null`;
    case "javascript": return base;
    case "go":         return base === "bool" ? "*bool" : base.startsWith("[]") ? base : `*${base}`;
    case "kotlin":     return `${base}?`;
    case "swift":      return `${base}?`;
    case "cpp":        return `std::optional<${base}>`;
    case "rust":       return `Option<${base}>`;
    default:           return base;
  }
}

/* ── Code Generators ─────────────────────────────────────────── */

function genCSharp({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const needsSchema = columns.some(c => c.isAutoIncrement);
  const needsXDoc   = columns.some(c => getBaseType(c, "csharp") === "XDocument");
  const lines = [
    "using System;",
    ...(needsSchema ? ["using System.ComponentModel.DataAnnotations;", "using System.ComponentModel.DataAnnotations.Schema;"] : []),
    ...(needsXDoc   ? ["using System.Xml.Linq;"] : []),
    "",
    `public class ${cls}`,
    "{",
  ];
  for (const col of columns) {
    const base     = getBaseType(col, "csharp");
    const type     = nullable(base, col, "csharp");
    const propName = convName(col.name, "pascal", mode);
    if (col.isAutoIncrement) lines.push("    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]");
    lines.push(`    public ${type} ${propName} { get; set; }`);
    lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
  lines.push("}");
  return lines.join("\n");
}

function genPython({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const imports = new Set<string>(["from dataclasses import dataclass", "from typing import Optional"]);
  for (const col of columns) {
    const t = getBaseType(col, "python");
    if (t === "datetime" || t === "date" || t === "time") imports.add("from datetime import datetime, date, time");
    if (t === "Decimal") imports.add("from decimal import Decimal");
    if (t === "UUID")    imports.add("from uuid import UUID");
  }
  const lines = [...imports, "", "", "@dataclass", `class ${cls}:`];
  for (const col of columns) {
    const base = getBaseType(col, "python");
    const type = nullable(base, col, "python");
    const fieldName = convName(col.name, "snake", mode);
    const defVal = col.isNullable && !col.isPrimaryKey ? " = None" : "";
    lines.push(`    ${fieldName}: ${type}${defVal}`);
  }
  return lines.join("\n");
}

function genJava({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const imports = new Set<string>(["import jakarta.persistence.*;", "import java.io.Serializable;"]);
  for (const col of columns) {
    const t = getBaseType(col, "java");
    if (t === "LocalDateTime" || t === "OffsetDateTime" || t === "LocalDate" || t === "LocalTime") imports.add("import java.time.*;");
    if (t === "BigDecimal") imports.add("import java.math.BigDecimal;");
    if (t === "UUID")       imports.add("import java.util.UUID;");
  }
  const lines = [
    ...imports, "",
    "@Entity",
    `@Table(name = "${cls}")`,
    `public class ${cls} implements Serializable {`, ""
  ];
  for (const col of columns) {
    const base = getBaseType(col, "java");
    const type = nullable(base, col, "java");
    const fieldName = convName(col.name, "camel", mode);
    if (col.isPrimaryKey) {
      lines.push("    @Id");
      if (col.isAutoIncrement) lines.push("    @GeneratedValue(strategy = GenerationType.IDENTITY)");
    }
    lines.push(`    @Column(name = "${col.name}"${!col.isNullable ? ", nullable = false" : ""})`);
    lines.push(`    private ${type} ${fieldName};`);
    lines.push("");
  }
  for (const col of columns) {
    const base = getBaseType(col, "java");
    const type = nullable(base, col, "java");
    const fieldName = convName(col.name, "camel", mode);
    const pascal   = convName(col.name, "pascal", mode);
    lines.push(`    public ${type} get${pascal}() { return ${fieldName}; }`);
    lines.push(`    public void set${pascal}(${type} ${fieldName}) { this.${fieldName} = ${fieldName}; }`);
    lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
  lines.push("}");
  return lines.join("\n");
}

function genTypeScript({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const lines = [`export interface ${cls} {`];
  for (const col of columns) {
    const base = getBaseType(col, "typescript");
    const type = col.isNullable && !col.isPrimaryKey ? `${base} | null` : base;
    const fieldName = convName(col.name, "camel", mode);
    lines.push(`    ${fieldName}${col.isNullable && !col.isPrimaryKey ? "?" : ""}: ${type};`);
  }
  lines.push("}");
  const keyField = convName(columns.find(c => c.isPrimaryKey || c.isAutoIncrement)?.name || "id", "camel", mode);
  lines.push("", `export type Create${cls} = Omit<${cls}, '${keyField}'>;`);
  lines.push(`export type Update${cls} = Partial<${cls}> & Pick<${cls}, '${keyField}'>;`);
  return lines.join("\n");
}

function genJavaScript({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const fields = columns.map(col => {
    const fieldName = convName(col.name, "camel", mode);
    const defVal =
      col.isNullable ? "null" :
      /INT|FLOAT|DECIMAL|NUMBER|DOUBLE|REAL/.test(col.sqlType) ? "0" :
      /BIT|BOOL/.test(col.sqlType) ? "false" :
      /DATE|TIME/.test(col.sqlType) ? "new Date()" : '""';
    return `        /** @type {${getBaseType(col, "typescript")}} */\n        this.${fieldName} = ${defVal};`;
  });
  return [
    `class ${cls} {`,
    `    constructor() {`,
    ...fields,
    `    }`,
    `}`,
    "",
    `module.exports = ${cls};`,
  ].join("\n");
}

function genGo({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const needsTime = columns.some(c => {
    const t = getBaseType(c, "go");
    return t === "time.Time" || t === "time.Duration";
  });
  const lines = [
    "package models",
    "",
    ...(needsTime ? ['import "time"', ""] : []),
    `type ${cls} struct {`,
  ];
  for (const col of columns) {
    const base = getBaseType(col, "go");
    const type = nullable(base, col, "go");
    const fieldName = mode === "exact"
      ? (col.name.charAt(0).toUpperCase() + col.name.slice(1))
      : toPascalCase(col.name);
    const dbTag   = col.name;
    const jsonTag = convName(col.name, "camel", mode);
    lines.push(`    ${fieldName.padEnd(20)} ${type.padEnd(16)} \`db:"${dbTag}" json:"${jsonTag}"\``);
  }
  lines.push("}");
  return lines.join("\n");
}

function genKotlin({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const imports = new Set<string>();
  for (const col of columns) {
    const t = getBaseType(col, "kotlin");
    if (t === "LocalDateTime" || t === "LocalDate" || t === "LocalTime" || t === "OffsetDateTime") imports.add("import java.time.*");
    if (t === "BigDecimal") imports.add("import java.math.BigDecimal");
    if (t === "UUID") imports.add("import java.util.UUID");
  }
  const lines = [
    ...(imports.size ? [...imports, ""] : []),
    `data class ${cls}(`,
  ];
  columns.forEach((col, i) => {
    const base = getBaseType(col, "kotlin");
    const type = nullable(base, col, "kotlin");
    const fieldName = convName(col.name, "camel", mode);
    const comma = i < columns.length - 1 ? "," : "";
    const defVal = col.isNullable && !col.isPrimaryKey ? " = null" : "";
    lines.push(`    val ${fieldName}: ${type}${defVal}${comma}`);
  });
  lines.push(")");
  return lines.join("\n");
}

function genSwift({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const needsFoundation = columns.some(c => ["Date","UUID","Data","Decimal"].includes(getBaseType(c, "swift")));
  const lines = [
    ...(needsFoundation ? ["import Foundation", ""] : []),
    `struct ${cls}: Codable {`,
  ];
  const codingKeys: string[] = [];
  for (const col of columns) {
    const base = getBaseType(col, "swift");
    const type = nullable(base, col, "swift");
    const fieldName = convName(col.name, "camel", mode);
    lines.push(`    let ${fieldName}: ${type}`);
    if (fieldName !== col.name) codingKeys.push(`        case ${fieldName} = "${col.name}"`);
  }
  if (codingKeys.length) {
    lines.push("", "    enum CodingKeys: String, CodingKey {");
    lines.push(...codingKeys);
    lines.push("    }");
  }
  lines.push("}");
  return lines.join("\n");
}

function genCpp({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const needsOptional = columns.some(c => c.isNullable && !c.isPrimaryKey);
  const needsVector   = columns.some(c => getBaseType(c, "cpp").includes("vector"));
  const lines = [
    "#pragma once",
    "#include <string>",
    "#include <cstdint>",
    ...(needsOptional ? ["#include <optional>"] : []),
    ...(needsVector   ? ["#include <vector>"] : []),
    "",
    `struct ${cls} {`,
  ];
  for (const col of columns) {
    const base = getBaseType(col, "cpp");
    const type = nullable(base, col, "cpp");
    const fieldName = convName(col.name, "snake", mode);
    const defVal = col.isNullable && !col.isPrimaryKey ? "" : base === "bool" ? "{ false }" : base.includes("string") || base.includes("vector") ? "" : "{}";
    lines.push(`    ${type.padEnd(30)} ${fieldName}${defVal};`);
  }
  lines.push("};");
  return lines.join("\n");
}

function genRust({ tableName, rawTableName, columns }: ParsedTable, mode: NamingMode): string {
  const cls = mode === "exact" ? rawTableName : tableName;
  const needsChrono = columns.some(c => ["NaiveDateTime","NaiveDate","NaiveTime","DateTime<Utc>"].includes(getBaseType(c, "rust")));
  const needsUuid   = columns.some(c => getBaseType(c, "rust") === "Uuid");
  const needsSerde  = columns.some(c => getBaseType(c, "rust") === "serde_json::Value");
  const lines = [
    ...(needsChrono ? ["use chrono::{NaiveDateTime, NaiveDate, NaiveTime, DateTime, Utc};"] : []),
    ...(needsUuid   ? ["use uuid::Uuid;"] : []),
    ...(needsSerde  ? ["use serde_json;"] : []),
    "use serde::{Deserialize, Serialize};",
    "",
    "#[derive(Debug, Clone, Serialize, Deserialize)]",
    ...(mode === "convention" ? ['#[serde(rename_all = "snake_case")]'] : []),
    `pub struct ${cls} {`,
  ];
  for (const col of columns) {
    const base = getBaseType(col, "rust");
    const type = nullable(base, col, "rust");
    const fieldName = convName(col.name, "snake", mode);
    if (mode === "convention") {
      const pascal = toPascalCase(col.name);
      if (fieldName !== toSnakeCase(pascal)) lines.push(`    #[serde(rename = "${col.name}")]`);
    } else if (fieldName !== col.name) {
      lines.push(`    #[serde(rename = "${col.name}")]`);
    }
    lines.push(`    pub ${fieldName}: ${type},`);
  }
  lines.push("}");
  return lines.join("\n");
}

function generateCode(table: ParsedTable, lang: string, mode: NamingMode): string {
  switch (lang) {
    case "csharp":     return genCSharp(table, mode);
    case "python":     return genPython(table, mode);
    case "java":       return genJava(table, mode);
    case "typescript": return genTypeScript(table, mode);
    case "javascript": return genJavaScript(table, mode);
    case "go":         return genGo(table, mode);
    case "kotlin":     return genKotlin(table, mode);
    case "swift":      return genSwift(table, mode);
    case "cpp":        return genCpp(table, mode);
    case "rust":       return genRust(table, mode);
    default:           return "// Unsupported language";
  }
}

/* ── Samples ─────────────────────────────────────────────────── */
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
  json: `{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "createdAt": "2026-01-15T10:30:00Z",
  "isActive": true,
  "balance": 1250.75,
  "profileImage": null,
  "uniqueCode": "550e8400-e29b-41d4-a716-446655440000"
}`,
  xml: `<users>
  <user>
    <id>1</id>
    <username>johndoe</username>
    <email>john@example.com</email>
    <firstName>John</firstName>
    <lastName>Doe</lastName>
    <dateOfBirth>1990-05-15</dateOfBirth>
    <createdAt>2026-01-15T10:30:00Z</createdAt>
    <isActive>true</isActive>
    <balance>1250.75</balance>
  </user>
  <user>
    <id>2</id>
    <username>janedoe</username>
    <email>jane@example.com</email>
    <firstName>Jane</firstName>
    <lastName>Doe</lastName>
    <dateOfBirth>1992-08-22</dateOfBirth>
    <createdAt>2026-02-20T14:15:00Z</createdAt>
    <isActive>false</isActive>
    <balance>890.50</balance>
  </user>
</users>`,
};

/* ── Component ──────────────────────────────────────────────── */
export default function SqlToModel() {
  const [dialect, setDialect] = useState("sqlserver");
  const [lang,    setLang]    = useState("csharp");
  const [mode,    setMode]    = useState<NamingMode>("exact");
  const [input,   setInput]   = useState("");
  const [output,  setOutput]  = useState("");
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState(false);

  const selectedLang = TARGET_LANGS.find(l => l.value === lang)!;
  const isSql = dialect !== "json" && dialect !== "xml";

  const convert = () => {
    setError(""); setOutput("");
    try {
      const table = parseInput(input, dialect);
      setOutput(generateCode(table, lang, mode));
    } catch (e) {
      setError(String(e).replace(/^Error:\s*/, ""));
    }
  };

  const loadSample = () => { setInput(SAMPLES[dialect] || ""); setOutput(""); setError(""); };

  const copyOutput = async () => {
    try { await navigator.clipboard.writeText(output); } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `model.${selectedLang.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const accent = "#2563eb";
  const glow   = "rgba(37,99,235,0.25)";

  return (
    <div style={{ background:"#ffffff" }} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe 30%,#fff)", padding:"36px 40px 28px" }}>
        <p className="section-label mb-2" style={{ color:accent }}>Database Tool</p>
        <div className="section-line" style={{ margin:"0 0 12px", background:"linear-gradient(90deg,#2563eb,#1d4ed8)" }} />
        <h1 className="font-black tracking-tight mb-2" style={{ fontSize:"clamp(26px,3.5vw,48px)", color:"#0f0a1e" }}>
          Schema <span style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>→ Model</span>
        </h1>
        <p style={{ color:"rgba(15,10,30,0.5)", fontSize:15, maxWidth:660 }}>
          Paste <strong>CREATE TABLE</strong> SQL, <strong>JSON</strong>, or <strong>XML</strong> — from SQL Server, MySQL, PostgreSQL, Oracle, SQLite, JSON or XML — and instantly generate a typed model class in C#, Python, Java, TypeScript, Go, Kotlin, Swift, C++ or Rust.
        </p>
      </section>

      <div style={{ width:"100%", padding:"20px 40px 48px", flex:1, boxSizing:"border-box", maxWidth:1280, margin:"0 auto" }}>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:18, alignItems:"flex-end" }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Source Format</label>
            <select
              value={dialect} onChange={e => setDialect(e.target.value)}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid rgba(37,99,235,0.3)", fontSize:13, fontWeight:600, color:"#0f0a1e", background:"#fff", cursor:"pointer", outline:"none" }}
            >
              {SQL_DIALECTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Target Language</label>
            <select
              value={lang} onChange={e => setLang(e.target.value)}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid rgba(37,99,235,0.3)", fontSize:13, fontWeight:600, color:"#0f0a1e", background:"#fff", cursor:"pointer", outline:"none" }}
            >
              {TARGET_LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Naming</label>
            <select
              value={mode} onChange={e => setMode(e.target.value as NamingMode)}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid rgba(37,99,235,0.3)", fontSize:13, fontWeight:600, color:"#0f0a1e", background:"#fff", cursor:"pointer", outline:"none" }}
              title="Exact: keep field names exactly as written. Convention: re-case names to each language's usual style."
            >
              <option value="exact">Match source exactly</option>
              <option value="convention">Language convention</option>
            </select>
          </div>

          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"flex-end" }}>
            <button
              onClick={loadSample}
              style={{ padding:"8px 16px", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", background:"rgba(37,99,235,0.07)", color:accent, border:"1.5px solid rgba(37,99,235,0.2)" }}
            >
              Load Example
            </button>
            <button
              onClick={convert}
              disabled={!input.trim()}
              style={{ padding:"9px 24px", borderRadius:9, fontSize:13, fontWeight:700, cursor:input.trim()?"pointer":"not-allowed", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"#fff", border:"none", boxShadow:`0 4px 14px ${glow}`, opacity:input.trim()?1:0.5 }}
            >
              Convert →
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(225,29,72,0.05)", border:"1px solid rgba(225,29,72,0.2)", fontSize:13, color:"#e11d48", marginBottom:14 }}>
            <strong>✕ Parse error:</strong> {error}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
              {isSql ? "SQL — CREATE TABLE" : dialect === "json" ? "JSON Input" : "XML Input"}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                isSql
                  ? "Paste your CREATE TABLE SQL here…\n\nExample:\nCREATE TABLE [dbo].[Users] (\n    [UserId]   INT IDENTITY(1,1) NOT NULL,\n    [Username] NVARCHAR(100)     NOT NULL,\n    …\n);"
                  : dialect === "json"
                  ? 'Paste your JSON here…\n\nExample:\n{\n  "id": 1,\n  "username": "johndoe",\n  "email": "john@example.com",\n  "isActive": true\n}'
                  : "Paste your XML here…\n\nExample:\n<user>\n  <id>1</id>\n  <username>johndoe</username>\n  <email>john@example.com</email>\n</user>"
              }
              spellCheck={false}
              style={{
                width:"100%", height:480, padding:"16px", borderRadius:12, resize:"vertical",
                border:"1.5px solid rgba(37,99,235,0.2)", background:"#f8faff",
                fontFamily:"'Cascadia Code','Fira Code',monospace", fontSize:12.5, lineHeight:1.65,
                color:"#0f0a1e", outline:"none", boxSizing:"border-box",
              }}
            />
          </div>

          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ fontSize:11, fontWeight:700, color:"rgba(15,10,30,0.4)", letterSpacing:"0.07em", textTransform:"uppercase" }}>
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
              value={output || (error ? "" : "// Generated code will appear here…\n// Paste your input on the left and click Convert →")}
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

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:16 }}>
          {["SQL Server / SSMS","MySQL","PostgreSQL","Oracle","SQLite","JSON","XML"].map(d => (
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
        <p>© 2026 iNeedTools · Schema → Model</p>
      </footer>
    </div>
  );
}