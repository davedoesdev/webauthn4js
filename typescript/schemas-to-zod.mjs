import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { jsonSchemaToZod } from "json-schema-to-zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

function reviver(k, v) {
    if (v.$ref) {
        v.const = v.$ref;
        delete v.$ref;
    }
    if (v.default !== undefined) {
        if (v.description) {
            v.description += ' ';
        } else {
            v.description = '';
        }
        let vdef = v.default;
        const prefix = '#/$defs/';
        if ((typeof vdef === 'string') && vdef.startsWith(prefix)) {
            vdef = `{@link ${vdef.substr(prefix.length)}}`;
        }
        v.description += '@defaultValue ' + vdef; 
    }
    if (v.contentEncoding !== undefined) {
        if (v.description) {
            v.description = ' ' + v.description;
        } else {
            v.description = '';
        }
        v.description = `(**${v.contentEncoding}**)` + v.description;
    }
    return v;
}

const schemas = JSON.parse(readFileSync(join(__dirname, '..', 'schemas', 'schemas.json')), reviver);

process.stdout.write('import { z } from "zod";');
process.stdout.write(EOL);

for (const type in schemas.$defs) {
    process.stdout.write(`export const ${type} = `);
    process.stdout.write(jsonSchemaToZod(schemas.$defs[type]));
    process.stdout.write(';');
    process.stdout.write(EOL);

}
