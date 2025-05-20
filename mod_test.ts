import { inferType, setupTypeDetective } from "./mod.ts";
import { assertEquals } from "@std/assert";

/**
 * Normalizes a TypeScript type string for robust, order-insensitive, and whitespace-insensitive comparison.
 * Is just a helper for comparing type strings in tests.
 *
 * - Removes all whitespace, semicolons, and line breaks.
 * - Sorts union members inside Array<...> recursively, so that 'Array<number|string>' and 'Array<string|number>' are treated as equal.
 * - Sorts top-level union members (not inside angle brackets) for order-insensitive comparison.
 * - This is useful for testing type inference output, where the order of union members is not semantically important in TypeScript.
 *
 * @param typeStr The type string to normalize.
 * @returns The normalized type string, with unions sorted and whitespace removed.
 */
function normalizeTypeString(typeStr: string): string {
  let s = typeStr.replace(/\s+/g, "")
    .replace(/;/g, "")
    .replace(/(\r\n|\n|\r)/gm, "")
    .replace(/ /g, "");
  // Sort union members inside Array<...> recursively
  s = s.replace(/Array<([^<>]*)>/g, (match, inner) => {
    // If inner contains |, sort the union members
    if (inner.includes("|")) {
      return "Array<" + inner.split("|").map((x: string) =>
        x.trim()
      ).sort().join("|") + ">";
    }
    return match;
  });
  // Sort union members at the top level (not inside Array)
  if (s.includes("|")) {
    // Only split at top-level, not inside <>
    const parts = [];
    let depth = 0, last = 0;
    for (let i = 0; i < s.length; ++i) {
      if (s[i] === "<") depth++;
      if (s[i] === ">") depth--;
      if (s[i] === "|" && depth === 0) {
        parts.push(s.slice(last, i));
        last = i + 1;
      }
    }
    if (parts.length > 0) {
      parts.push(s.slice(last));
      return parts.map((x: string) => x.trim()).sort().join("|");
    }
  }
  return s;
}

// Helper to test both array styles
type ArrayStyle = "generic" | "postfix";
function testArrayStyles(
  name: string,
  testFn: (arrayStyle: ArrayStyle) => void,
) {
  (["generic", "postfix"] as const).forEach((arrayStyle) => {
    Deno.test(`${name} (${arrayStyle})`, () => testFn(arrayStyle));
  });
}

// --- Primitives ---
Deno.test("inferType: primitives", () => {
  assertEquals(inferType(42), "number");
  assertEquals(inferType("hello"), "string");
  assertEquals(inferType(true), "boolean");
  assertEquals(inferType(undefined), "undefined");
  assertEquals(inferType(null), "null");
  assertEquals(
    typeof Symbol !== "undefined" ? inferType(Symbol("s")) : "symbol",
    "symbol",
  );
  assertEquals(
    typeof BigInt !== "undefined" ? inferType(BigInt(10)) : "bigint",
    "bigint",
  );
});

// --- Functions ---
Deno.test("inferType: function", () => {
  assertEquals(inferType(() => {}), "() => unknown");
});

// --- Objects ---
Deno.test("inferType: plain object", () => {
  assertEquals(
    normalizeTypeString(inferType({})),
    normalizeTypeString("Record<string | number | symbol, never>"),
  );
  assertEquals(
    normalizeTypeString(inferType({ a: 1, b: "x" })),
    normalizeTypeString("{ a: number; b: string; }"),
  );
});

Deno.test("inferType: nested object", () => {
  assertEquals(
    normalizeTypeString(inferType({ a: { b: 2 } })),
    normalizeTypeString("{ a: { b: number; }; }"),
  );
});

// --- Arrays ---
testArrayStyles("inferType: array of primitives", (arrayStyle) => {
  setupTypeDetective({ arrayStyle });
  assertEquals(
    normalizeTypeString(inferType([1, 2, 3])),
    normalizeTypeString(
      arrayStyle === "generic" ? "Array<number>" : "number[]",
    ),
  );
  assertEquals(
    normalizeTypeString(inferType([1, "a", true])),
    normalizeTypeString(
      arrayStyle === "generic"
        ? "Array<number | string | boolean>"
        : "(number | string | boolean)[]",
    ),
  );
});

testArrayStyles("inferType: array of objects (merge mode)", (arrayStyle) => {
  setupTypeDetective({ arrayStyle, mode: "merge" });
  assertEquals(
    normalizeTypeString(inferType([{ a: 1 }, { a: 2 }])),
    normalizeTypeString(
      arrayStyle === "generic" ? "Array<{ a: number; }>" : "{ a: number; }[]",
    ),
  );
  assertEquals(
    normalizeTypeString(inferType([{ a: 1 }, { b: "x" }])),
    normalizeTypeString(
      arrayStyle === "generic"
        ? "Array<{ a?: number; b?: string; }>"
        : "{ a?: number; b?: string; }[]",
    ),
  );
});

testArrayStyles("inferType: array of objects (union mode)", (arrayStyle) => {
  setupTypeDetective({ arrayStyle, mode: "union" });
  const arr = [{ a: 1 }, { b: "x" }];
  const expected = arrayStyle === "generic"
    ? "Array<{ a: number; } | { b: string; } >"
    : "({ a: number; } | { b: string; })[]";
  assertEquals(
    normalizeTypeString(inferType(arr)),
    normalizeTypeString(expected),
  );
});

testArrayStyles(
  "inferType: array of objects with optional keys",
  (arrayStyle) => {
    setupTypeDetective({ arrayStyle, mode: "merge" });
    const arr = [
      { id: 1, name: "Alice" },
      { id: 2, age: 30 },
    ];
    const expected = arrayStyle === "generic"
      ? "Array<{ age?: number; id: number; name?: string; }>"
      : "{ age?: number; id: number; name?: string; }[]";
    assertEquals(
      normalizeTypeString(inferType(arr)),
      normalizeTypeString(expected),
    );
  },
);

testArrayStyles("inferType: nested arrays", (arrayStyle) => {
  setupTypeDetective({ arrayStyle });
  assertEquals(
    normalizeTypeString(inferType([[1, 2], [3, 4]])),
    normalizeTypeString(
      arrayStyle === "generic" ? "Array<Array<number>>" : "number[][]",
    ),
  );
  assertEquals(
    normalizeTypeString(inferType([[1, "a"], [true, 2]])),
    normalizeTypeString(
      arrayStyle === "generic"
        ? "Array<Array<boolean | number | string>>"
        : "(boolean | number | string)[][]",
    ),
  );
});

testArrayStyles(
  "inferType: mixed array (primitives and objects)",
  (arrayStyle) => {
    setupTypeDetective({ arrayStyle });
    const expected = arrayStyle === "generic"
      ? "Array<number | string | { a: number; } >"
      : "(number | string | { a: number; })[]";
    const actual = inferType([2, "x", { a: 1 }]);
    assertEquals(
      normalizeTypeString(actual),
      normalizeTypeString(expected),
    );
  },
);

testArrayStyles("inferType: empty array", (arrayStyle) => {
  setupTypeDetective({ arrayStyle });
  assertEquals(
    inferType([]),
    arrayStyle === "generic" ? "Array<unknown>" : "unknown[]",
  );
});

// --- Config/Options ---
Deno.test("setupTypeDetective: arrayStyle and mode config", () => {
  setupTypeDetective({ mode: "union", arrayStyle: "generic" });
  const arr = [{ a: 1 }, { b: "x" }];
  const typeStr = inferType(arr);
  const expected = "Array<{ a: number; } | { b: string; } >";
  assertEquals(
    normalizeTypeString(typeStr),
    normalizeTypeString(expected),
  );

  setupTypeDetective({ mode: "merge", arrayStyle: "generic" });
  const arr2 = [
    { id: 1, name: "Alice" },
    { id: 2, age: 30 },
  ];
  const expected2 = "Array<{ age?: number; id: number; name?: string; }>";
  const typeStr2 = inferType(arr2);
  assertEquals(
    normalizeTypeString(typeStr2),
    normalizeTypeString(expected2),
  );
});
