// examples/basic.ts
// Basic usage: infer a type from a simple object
import { detectType } from "jsr:@pinta365/type-detective";

const data = {
  id: 1,
  name: "Alice",
  active: true,
};

const typeDef = detectType(data);
console.log(typeDef);

//Output:
// {
//   id: number;
//   name: string;
//   active: boolean;
// }
