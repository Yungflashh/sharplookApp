import fs from "fs";
import path from "path";
import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import babelGenerator from "@babel/generator"; // <-- change this line

const { default: generate } = babelGenerator;  // <-- this line fixes the issue

const targetDir = "./src"; // change if needed

function getAllFiles(dirPath, ext = [".js", ".jsx", ".ts", ".tsx"]) {
  let files = [];
  for (const file of fs.readdirSync(dirPath)) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(filePath, ext));
    } else if (ext.includes(path.extname(filePath))) {
      files.push(filePath);
    }
  }
  return files;
}

const files = getAllFiles(targetDir);

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");

  const ast = babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    attachComment: false,
  });

  const { code: newCode } = generate(ast, { comments: false }); // ✅ works now

  fs.writeFileSync(file, newCode, "utf8");
  console.log(`✅ Cleaned: ${file}`);
}

console.log("🎉 All comments removed safely!");
