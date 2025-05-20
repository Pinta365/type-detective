// examples/merge-vs-union.ts
// Demonstrates the difference between merge and union modes
import { detectType, setupTypeDetective } from "jsr:@pinta365/type-detective";

const arr = [
  { a: 1 },
  { b: "hello" },
];

// Merge mode (default)
setupTypeDetective({ mode: "merge" });
console.log("Merge mode:");
console.log(detectType(arr));

// Union mode
setupTypeDetective({ mode: "union" });
console.log("Union mode:");
console.log(detectType(arr));

//Output:
////Merge mode:
// {
//   a?: number;
//   b?: string;
// }[]
//
////Union mode:
// ({
//   a: number;
// } |
// {
//   b: string;
// })[]
