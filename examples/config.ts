// examples/config.ts
// Demonstrates custom configuration for indentation and array style
import { detectType, setupTypeDetective } from "jsr:@pinta365/type-detective";

setupTypeDetective({
  indent: 4,
  indentType: "space",
  arrayStyle: "generic",
});

const data = {
  users: [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ],
};

console.log(detectType(data));

//Output:
// {
//   users: Array<{
//       id: number;
//       name: string;
//   }>;
// }
