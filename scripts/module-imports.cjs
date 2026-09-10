const { readFileSync } = require('node:fs');
const { parse } = require('next/dist/compiled/acorn/acorn.js');
const ast = parse(readFileSync(process.argv[2], 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
process.stdout.write(JSON.stringify(ast.body.filter(node => node.source && ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)).map(node => node.source.value)));
