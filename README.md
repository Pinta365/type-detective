# type-detective

[![JSR](https://jsr.io/badges/@pinta365/type-detective)](https://jsr.io/@pinta365/type-detective)
[![JSR Score](https://jsr.io/badges/@pinta365/type-detective/score)](https://jsr.io/@pinta365/type-detective)

Detect and generate TypeScript type definitions from your data.

Type Detective is a runtime-agnostic module for TypeScript type inference from
JavaScript objects and arrays. It works with Deno, Bun, or Node.js.
TypeDetective analyzes the structure of your data and generates TypeScript type
definitions. This is useful for quickly scaffolding types from sample data,
especially when working with dynamic or unknown JSON structures. Since there are
nearly always multiple ways to type things the library has to be fairly
opinionated. Will make some things configurable.

## Features

- **Infer TypeScript types**
- **Handles nested objects, arrays, primitives, null, undefined, and functions**
- **Unifies array element types** to produce a single type definition for arrays
  of objects

## Why Use Type Detective?

Type Detective is designed for developers who:

- Work with dynamic, unknown, or rapidly changing JSON/data structures.
- Need to quickly scaffold TypeScript types from real data samples (e.g., API
  responses, logs, config files).
- Want to reduce manual effort and errors when writing type definitions for
  complex or deeply nested data.
- Generate types at runtime, directly from JavaScript objects or arrays, rather
  than by hand.
- Need to unify and merge types from arrays of objects (e.g., for API results
  with optional/variant fields).

**Use Type Detective when you want to:**

- Jumpstart TypeScript adoption in a JS-heavy codebase.
- Document and validate backend or frontend data models.
- Prototype or reverse-engineer types from real-world data.
- Save time and avoid mistakes in type definition writing.

## Installation

```bash
# Deno
deno add jsr:@pinta365/type-detective

# Node.js
npx jsr add @pinta365/type-detective

# Bun
bunx jsr add @pinta365/type-detective
```

## Basic Usage

```typescript
import { detectType } from "@pinta365/type-detective";

//Very simple example object
const simpleObject = {
  name: "John",
  age: 30,
  isAdmin: true,
};

const typeDefinitionSimple = detectType(simpleObject);
console.log(typeDefinitionSimple);
//Output:
// {
//   name: string;
//   age: number;
//   isAdmin: boolean;
// }

// Example array data from an API response with optional hobbies. Unified into one type.
const apiResponse = [
  {
    id: 1,
    name: { first: "john", last: "doe" },
    age: 30,
    hobbies: ["reading", "coding"],
  },
  { id: 2, name: { first: "jane", last: "doe" }, age: 32 },
];

const typeDefinition = detectType(apiResponse);
console.log(typeDefinition);
//Output:
// {
//   age: number;
//   hobbies?: string[];
//   id: number;
//   name: {
//     first: string;
//     last: string;
//   };
// }[]

//Example with union type.
const notifications = [
  { type: "message", from: "Alice", text: "Hello!" },
  { type: "friend_request", from: "Bob", mutualFriends: 3 },
];
//Call setup with union mode.
setupTypeDetective({ mode: "union" });

const typeDefinitionUnion = detectType(notifications);
console.log(typeDefinitionUnion);
//Output:
// ({
//   type: string;
//   from: string;
//   text: string;
// } |
// {
//   type: string;
//   from: string;
//   mutualFriends: number;
// })[]
```

## Writing Types to File

Here's examples on how to save the inferred types to a file:

### Deno

```typescript
import { detectType } from "@pinta365/type-detective";

const data = {/* your data */};
const typeName = "MyType";
const typeDef = detectType(data);
const fileContent = `export type ${typeName} = ${typeDef};\n`;

// Using Deno's built-in file system API
await Deno.writeTextFile("./types.ts", fileContent);
```

## Configuration

You can customize TypeDetective's behavior using `setupTypeDetective`:

```typescript
import { setupTypeDetective } from "@pinta365/type-detective";

setupTypeDetective({
  // Number of spaces or tabs per indentation level
  indent: 2,

  // Use "space" or "tab" for indentation
  indentType: "space",

  // Array type style: "postfix" (T[]) or "generic" (Array<T>)
  arrayStyle: "postfix",

  // Type merging strategy: "merge" or "union"
  mode: "merge",
});
```

## Type Merging Modes

### Merge Mode (default)

Combines all possible shapes into a single type:

```typescript
const data = [
  { id: 1, name: "John" },
  { id: 2, email: "jane@example.com" },
];

// Results in:
// {
//   id: number;
//   name?: string;
//   email?: string;
// }
```

### Union Mode

Preserves distinct shapes as a union type:

```typescript
const data = [
  { id: 1, name: "John" },
  { id: 2, email: "jane@example.com" },
];

// Results in:
// {
//   id: number;
//   name: string;
// } | {
//   id: number;
//   email: string;
// }
```

## License

MIT
