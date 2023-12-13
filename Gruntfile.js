/*eslint-env node */
const { homedir } = require('os');
const { join } = require('path');

const c8 = "npx c8 -x Gruntfile.js -x wdio.conf.js -x wasm_exec.js -x 'test/**'";

module.exports = function (grunt) {
    grunt.initConfig({
        env: {
            test: {
                TMPDIR: join(homedir(), 'tmp')
            }
        },

        eslint: {
            default: {
                src: [ '*.js', 'test/**/*.js', '!wasm_exec.js' ]
            },
            typescript: {
                src: 'typescript/**/*.ts'
            }
        },

        exec: {
            build_go: [
                'GOARCH=wasm GOOS=js go build -o webauthn4js.wasm webauthn4js.go user.go',
                'go build genschema.go user.go',
                './genschema > schemas/schemas.autogen.json',
                "npx jme schemas/schemas.autogen.json schemas/schemas.doc.json > schemas/schemas.json"
            ].join('&&'),
            build_ts: [
                'node typescript/schemas-to-zod.mjs > typescript/schemas.zod.ts',
                'npx tsc --target es2017 --moduleResolution node typescript/schemas.zod.ts',
                // https://github.com/microsoft/TypeScript/issues/18442
                'mv typescript/schemas.zod.js typescript/schemas.zod.mjs',
                'node typescript/zod-to-ts.mjs > typescript/webauthn.d.ts',
                'npx tsc -p typescript',
                'mv typescript/example.js typescript/example.mjs'
            ].join('&&'),
            test: 'npx wdio',
            cover: `${c8} npx grunt test`,
            cover_report: `${c8} report -r lcov -r text`,
            cover_check: `${c8} check-coverage --statements 100 --branches 100 --functions 100 --lines 100`,
            docs: [
                'npx typedoc index.d.ts',
                'asciidoc -b docbook -o - README.adoc | pandoc -f docbook -t gfm -o README.md'
            ].join('&&')
        }
    });

    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-env');

    grunt.registerTask('build', [
        'exec:build_go',
        'exec:build_ts'
    ]);

    grunt.registerTask('lint', [
        'eslint:default',
        'eslint:typescript'
    ]);

    grunt.registerTask('test', ['env:test', 'exec:test']);

    grunt.registerTask('coverage', [
        'exec:cover',
        'exec:cover_report',
        'exec:cover_check'
    ]);

    grunt.registerTask('coveralls', 'exec:coveralls');

    grunt.registerTask('docs', [
        'exec:build_go',
        'exec:build_ts',
        'exec:docs'
    ]);

    grunt.registerTask('default', ['lint', 'test']);
};
