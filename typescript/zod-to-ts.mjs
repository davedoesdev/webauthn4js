import { EOL } from 'node:os';
import * as schemas from './schemas.zod.mjs';
import { createTypeAlias, printNode, zodToTs } from 'zod-to-ts';
import { ZodDefault, ZodObject } from 'zod';
import ts from 'typescript';

const defs_prefix = '#/$defs/';

function replace_refs(node, parent) {
    if ((node.kind === ts.SyntaxKind.StringLiteral) &&
        (parent.kind === ts.SyntaxKind.LiteralType) &&
        (node.text.startsWith(defs_prefix))) {
        node.kind = ts.SyntaxKind.Identifier;
        node.escapedText = node.text.substr(defs_prefix.length);
        parent.kind = ts.SyntaxKind.TypeReference;
        parent.typeName = node;

    }
    node.forEachChild(child => replace_refs(child, node));
}

for (const type in schemas) {
    const { node } = zodToTs(schemas[type], type);
    const typeAlias = createTypeAlias(node, type);
    replace_refs(typeAlias);
    let nodeString = printNode(typeAlias);
    let description = schemas[type].description;
    if (description) {
        let pos = description.indexOf('eslint');
        if (pos >= 0) {
            nodeString = '/*' + description.substr(pos) + '*/' + nodeString;
            description = description.substr(0, pos);
        }
        process.stdout.write(`/** ${description} */`);
        process.stdout.write(EOL);
    }
    process.stdout.write("export ");
    process.stdout.write(nodeString);
    process.stdout.write(EOL);
}
