import { EOL } from 'node:os';
import * as schemas from './schemas.zod.mjs';
import { createTypeAlias, printNode, zodToTs } from 'zod-to-ts';
import ts from 'typescript';

const defs_prefix = '#/$defs/';

function replace(node, parent) {
    if ((node.kind === ts.SyntaxKind.StringLiteral) &&
        (parent.kind === ts.SyntaxKind.LiteralType) &&
        (node.text.startsWith(defs_prefix))) {
        node.kind = ts.SyntaxKind.Identifier;
        node.escapedText = node.text.substr(defs_prefix.length);
        parent.kind = ts.SyntaxKind.TypeReference;
        parent.typeName = node;

    }
    node.forEachChild(child => replace(child, node));
}

for (const type in schemas) {
    const { node } = zodToTs(schemas[type], type);
    const typeAlias = createTypeAlias(node, type);
    replace(typeAlias);
    const nodeString = printNode(typeAlias);
    process.stdout.write("export ");
    process.stdout.write(nodeString);
    process.stdout.write(EOL);
}
