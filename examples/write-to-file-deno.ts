// examples/write-to-file-deno.ts
// Demonstrates writing an inferred type to a file using Deno
import { detectType } from "jsr:@pinta365/type-detective";

const data = [
  { id: 1, name: "Alice" },
  { id: 2, email: "bob@example.com" },
];

const typeName = "User";
const typeDef = detectType(data);
const fileContent = `export type ${typeName} = ${typeDef};\n`;

await Deno.writeTextFile("./UserType.ts", fileContent);
console.log("Type definition written to UserType.ts");

//Output:
//Type definition written to UserType.ts
// export type User = {
//   email?: string;
//   id: number;
//   name?: string;
// }[];
