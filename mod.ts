/**
 * mod.ts: Type Detective
 */

/**
 * Type merging strategy for arrays/objects.
 * - "merge": Combine all shapes into a single type (default).
 * - "union": Create a union of all possible shapes.
 */
export type TypeDetectiveMode = "merge" | "union";

/**
 * Indentation style for generated types.
 * - "space": Use spaces (default).
 * - "tab": Use tabs.
 */
export type TypeDetectiveIndentType = "space" | "tab";

/**
 * Array type style for output.
 * - "postfix": T[] (default)
 * - "generic": Array<T>
 */
export type TypeDetectiveArrayStyle = "generic" | "postfix";

/** Config object type  */
export type TypeDetectiveConfig = {
  /** type merging strategy for arrays/objects. */
  mode: TypeDetectiveMode;
  /** number of spaces or tabs per level */
  indent: number;
  /** type of indent */
  indentType: TypeDetectiveIndentType;
  /** internal, computed string */
  _computedIndent: string;
  /** array type style (default: 'postfix') */
  arrayStyle: TypeDetectiveArrayStyle;
};

/**  Global config for default options */
const typeDetectiveConfig: TypeDetectiveConfig = {
  mode: "merge",
  indent: 2,
  indentType: "space",
  _computedIndent: "  ",
  arrayStyle: "postfix",
};

/**
 * Recursively infers the TypeScript type of a given JavaScript value.
 * Handles primitives, arrays, objects, and functions.
 * For arrays, supports 'merge' (combine all possible shapes) or 'union' (union of all element types) modes.
 * For objects, infers property types and supports nested structures.
 *
 * @param value - The value to infer the type from.
 * @param indentLevel - The current indentation level for pretty-printing nested types (default: 0).
 * @param mode - Optional. 'merge' (default) merges all object/array shapes, 'union' creates a union of all possible shapes.
 * @returns A string representing the inferred TypeScript type.
 */
export function inferType(
  value: unknown,
  indentLevel = 0,
  mode: TypeDetectiveMode = typeDetectiveConfig.mode,
): string {
  const indent = typeDetectiveConfig._computedIndent.repeat(indentLevel);
  const nextIndent = typeDetectiveConfig._computedIndent.repeat(
    indentLevel + 1,
  );

  if (value === null) {
    return "null";
  }

  const type = typeof value;

  if (
    type === "undefined" ||
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    type === "symbol" ||
    type === "bigint"
  ) {
    return type;
  }

  if (type === "function") {
    return "() => unknown";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return typeDetectiveConfig.arrayStyle === "postfix"
        ? "unknown[]"
        : "Array<unknown>";
    }

    if (value.every((el) => Array.isArray(el))) {
      const subArrayTypes = value.map((subArr) =>
        inferType(subArr, indentLevel + 1, mode)
      );
      if (mode === "merge") {
        let elementTypes: string[] = [];
        subArrayTypes.forEach((typeStr) => {
          if (typeDetectiveConfig.arrayStyle === "postfix") {
            const match = typeStr.match(/^(.*)\[\]$/);
            if (match) {
              elementTypes.push(match[1]);
            } else {
              elementTypes.push(typeStr);
            }
          } else {
            const match = typeStr.match(/^Array<(.+)>$/s);
            if (match) {
              elementTypes = elementTypes.concat(
                match[1].split("|").map((x) => x.trim()),
              );
            } else {
              elementTypes.push(typeStr);
            }
          }
        });

        if (typeDetectiveConfig.arrayStyle === "postfix") {
          const flatTypes: string[] = [];
          elementTypes.forEach((t) => {
            t = t.trim();
            if (t.startsWith("(") && t.endsWith(")")) {
              t = t.slice(1, -1);
            }
            t.split("|").forEach((part) => {
              flatTypes.push(part.trim());
            });
          });
          const dedupedElementTypes = Array.from(new Set(flatTypes)).sort();
          const mergedElementType = dedupedElementTypes.join("|");
          return dedupedElementTypes.length === 1
            ? `${mergedElementType}[][]`
            : `(${mergedElementType})[][]`;
        } else {
          const dedupedElementTypes = Array.from(new Set(elementTypes)).sort();
          const mergedElementType = dedupedElementTypes.join("|");
          return `Array<Array<${mergedElementType}>>`;
        }
      } else {
        const uniqueTypes = Array.from(new Set(subArrayTypes));
        const multiline = uniqueTypes.some((t) => t.includes("\n"));
        if (multiline) {
          if (typeDetectiveConfig.arrayStyle === "postfix") {
            const baseTypes = uniqueTypes.map((t) => {
              const match = t.match(/^(.*)\[\]$/);
              return match ? match[1] : t;
            });
            return baseTypes.length === 1
              ? `${baseTypes[0]}[][]`
              : `(${baseTypes.join(` |\n${nextIndent}`)})[][]`;
          } else {
            return `Array<\n${nextIndent}${
              uniqueTypes.join(` |\n${nextIndent}`)
            }\n${indent}>`;
          }
        } else {
          if (typeDetectiveConfig.arrayStyle === "postfix") {
            const baseTypes = uniqueTypes.map((t) => {
              const match = t.match(/^(.*)\[\]$/);
              return match ? match[1] : t;
            });
            const flatTypes: string[] = [];
            baseTypes.forEach((t) => {
              t = t.trim();
              if (t.startsWith("(") && t.endsWith(")")) {
                t = t.slice(1, -1);
              }
              t.split("|").forEach((part) => {
                flatTypes.push(part.trim());
              });
            });
            const dedupedBaseTypes = Array.from(new Set(flatTypes)).sort();
            return dedupedBaseTypes.length === 1
              ? `${dedupedBaseTypes[0]}[][]`
              : `(${dedupedBaseTypes.join(" | ")})[][]`;
          } else {
            return `Array<${uniqueTypes.join(" | ")}>`;
          }
        }
      }
    }

    if (
      value.every((el) => el && typeof el === "object" && !Array.isArray(el))
    ) {
      if (mode === "merge") {
        if (typeDetectiveConfig.arrayStyle === "postfix") {
          const merged = mergeObjectArrayTypes(value, indentLevel, mode);
          return merged.startsWith("{") ? `${merged}[]` : `(${merged})[]`;
        } else {
          return `Array<${mergeObjectArrayTypes(value, indentLevel, mode)}>`;
        }
      } else if (mode === "union") {
        const objectTypes = value.map((obj) =>
          inferType(obj, indentLevel + 1, mode)
        );
        const uniqueTypes = Array.from(new Set(objectTypes));
        const multiline = uniqueTypes.some((t) => t.includes("\n"));
        if (multiline) {
          if (typeDetectiveConfig.arrayStyle === "postfix") {
            return uniqueTypes.length === 1
              ? `${uniqueTypes[0]}[]`
              : `(${uniqueTypes.join(` |\n${nextIndent}`)})[]`;
          } else {
            return `Array<\n${nextIndent}${
              uniqueTypes.join(` |\n${nextIndent}`)
            }\n${indent}>`;
          }
        } else {
          if (typeDetectiveConfig.arrayStyle === "postfix") {
            const baseTypes = uniqueTypes.map((t) => {
              const match = t.match(/^(.*)\[\]$/);
              return match ? match[1] : t;
            });
            const flatTypes: string[] = [];
            baseTypes.forEach((t) => {
              t = t.trim();
              if (t.startsWith("(") && t.endsWith(")")) {
                t = t.slice(1, -1);
              }
              t.split("|").forEach((part) => {
                flatTypes.push(part.trim());
              });
            });
            const dedupedBaseTypes = Array.from(new Set(flatTypes)).sort();
            return dedupedBaseTypes.length === 1
              ? `${dedupedBaseTypes[0]}[][]`
              : `(${dedupedBaseTypes.join(" | ")})[][]`;
          } else {
            return `Array<${uniqueTypes.join(" | ")}>`;
          }
        }
      }
    }

    const elementTypes = new Set<string>();
    for (const el of value) {
      if (Array.isArray(el)) {
        elementTypes.add(inferType(el, indentLevel + 1, mode));
      } else if (el && typeof el === "object") {
        if (mode === "union") {
          elementTypes.add(inferType(el, indentLevel + 1, mode));
        } else {
          elementTypes.add(mergeObjectArrayTypes([el], indentLevel + 1, mode));
        }
      } else {
        elementTypes.add(inferType(el, indentLevel + 1, mode));
      }
    }
    const elementTypesArr = Array.from(elementTypes);
    if (typeDetectiveConfig.arrayStyle === "postfix") {
      return elementTypesArr.length === 1
        ? `${elementTypesArr[0]}[]`
        : `(${elementTypesArr.join(" | ")})[]`;
    } else {
      return `Array<${elementTypesArr.join(" | ")}>`;
    }
  }

  if (type === "object") {
    const properties: Record<string, string> = {};
    for (const key in value as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const val = (value as Record<string, unknown>)[key];
        if (Array.isArray(val)) {
          properties[key] = inferType(val, indentLevel + 1, mode);
        } else {
          properties[key] = inferType(val, indentLevel + 1, mode);
        }
      }
    }
    const keys = Object.keys(properties);
    if (keys.length === 0) {
      return "Record<string | number | symbol, never>";
    }
    let output = "{\n";
    for (const key of keys) {
      output += `${nextIndent}${key}: ${properties[key]};\n`;
    }
    output += `${indent}}`;
    return output;
  }

  return "unknown";
}

/**
 * Merges an array of type strings into a single type string.
 * Removes duplicates and sorts for consistency.
 * If multiple unique types are present, returns a union type string.
 *
 * @param types - Array of type strings.
 * @returns A single merged type string (union if multiple types).
 */
function mergeTypes(types: string[]): string {
  const unique = Array.from(new Set(types)).sort();
  return unique.length === 1 ? unique[0] : unique.join(" | ");
}

/**
 * Merges an array of objects into a single TypeScript object type string.
 * Collects all keys from all objects, marks missing keys as optional, and merges value types for each key.
 * Handles nested arrays and objects recursively.
 *
 * @param arr - Array of objects to merge.
 * @param indentLevel - Indentation level for pretty-printing (default: 0).
 * @param mode - 'merge' (default) merges all object shapes, 'union' creates a union of all possible shapes.
 * @returns A string representing the merged object type.
 */
function mergeObjectArrayTypes(
  arr: unknown[],
  indentLevel = 0,
  mode: TypeDetectiveMode = typeDetectiveConfig.mode,
): string {
  const indent = typeDetectiveConfig._computedIndent.repeat(indentLevel);
  const nextIndent = typeDetectiveConfig._computedIndent.repeat(
    indentLevel + 1,
  );
  if (!Array.isArray(arr) || arr.length === 0) {
    return "{ [key: string]: unknown }";
  }
  const allKeys = new Set<string>();
  for (const obj of arr) {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        allKeys.add(key);
      }
    }
  }
  const properties: Record<string, { types: string[]; presentCount: number }> =
    {};
  for (const key of allKeys) {
    properties[key] = { types: [], presentCount: 0 };
    for (const obj of arr) {
      if (
        obj && typeof obj === "object" && !Array.isArray(obj) &&
        Object.prototype.hasOwnProperty.call(obj, key)
      ) {
        const value = (obj as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          if (
            value.length > 0 &&
            value.every((v) => v && typeof v === "object" && !Array.isArray(v))
          ) {
            properties[key].types.push(
              `Array<${mergeObjectArrayTypes(value, indentLevel + 1, mode)}>`,
            );
          } else {
            properties[key].types.push(inferType(value, indentLevel + 1, mode));
          }
        } else if (value && typeof value === "object") {
          properties[key].types.push(
            mergeObjectArrayTypes([value], indentLevel + 1, mode),
          );
        } else {
          properties[key].types.push(inferType(value, indentLevel + 1, mode));
        }
        properties[key].presentCount++;
      }
    }
  }
  const keys = Array.from(allKeys).sort();
  if (keys.length === 0) {
    return "Record<string | number | symbol, never>";
  }
  let output = "{\n";
  for (const key of keys) {
    const isOptional = properties[key].presentCount < arr.length;
    output += `${nextIndent}${key}${isOptional ? "?" : ""}: ${
      mergeTypes(properties[key].types)
    };\n`;
  }
  output += `${indent}}`;
  return output;
}

/**
 * Detects the TypeScript type of the input value.
 * Alias for inferType, provided for semantic clarity.
 *
 * @param input - The value to infer the type from.
 * @param indentLevel - Indentation level for pretty-printing (default: 0).
 * @param mode - 'merge' (default) merges all object/array shapes, 'union' creates a union of all possible shapes.
 * @returns A string representing the detected TypeScript type.
 */
export function detectType(
  input: unknown,
  indentLevel = 0,
  mode: TypeDetectiveMode = typeDetectiveConfig.mode,
): string {
  return inferType(input, indentLevel, mode);
}

/**
 * Sets global options for type inference functions.
 * Allows customization of indentation, array style, and merge/union mode.
 *
 * @param options - Partial options to override defaults:
 *   - indent: number of spaces or tabs per level (default: 2)
 *   - indentType: 'space' (default) or 'tab'
 *   - arrayStyle: 'postfix' (default, T[]) or 'generic' (Array<T>)
 *   - mode: "merge" (default) merges all object shapes, "union" creates a union of all possible shapes
 */
export function setupTypeDetective(
  options: Partial<Omit<TypeDetectiveConfig, "_computedIndent">>,
) {
  if (typeof options.indent === "number" && options.indent > 0) {
    typeDetectiveConfig.indent = options.indent;
  }
  if (options.indentType === "space" || options.indentType === "tab") {
    typeDetectiveConfig.indentType = options.indentType;
  }
  if (options.arrayStyle === "generic" || options.arrayStyle === "postfix") {
    typeDetectiveConfig.arrayStyle = options.arrayStyle;
  }
  if (options.mode === "merge" || options.mode === "union") {
    typeDetectiveConfig.mode = options.mode;
  }
  // Compute the actual indent string
  if (typeDetectiveConfig.indentType === "tab") {
    typeDetectiveConfig._computedIndent = "\t".repeat(
      typeDetectiveConfig.indent,
    );
  } else {
    typeDetectiveConfig._computedIndent = " ".repeat(
      typeDetectiveConfig.indent,
    );
  }
}

/**
 * Returns the current global configuration for type inference.
 *
 * @returns The current TypeDetectiveConfig object.
 */
export function getTypeDetectiveConfig(): TypeDetectiveConfig {
  return typeDetectiveConfig;
}
