/*eslint-env node */

const c8 = "npx c8 -x Gruntfile.js -x wdio.conf.js -x wasm_exec.js -x 'test/**'";

module.exports = function (grunt) {
    grunt.initConfig({
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
                'GOARCH=wasm GOOS=js go build -o webauthn4js.wasm webauthn4js.go config.go user.go',
                'go build genschema.go config.go user.go',
                './genschema > schemas/schemas.autogen.json',
                'npx jme schemas/schemas.autogen.json schemas/schemas.doc.json > schemas/schemas.json',
                "npx json2ts --no-resolve --bannerComment '/** @module webauthn4js */' < schemas/schemas.json > typescript/webauthn.d.ts"
            ].join('&&'),
            build_ts: [
                'npx tsc -p typescript',
                // https://github.com/microsoft/TypeScript/issues/18442
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

    grunt.registerTask('build', [
        'exec:build_go',
        'exec:build_ts'
    ]);

    grunt.registerTask('lint', [
        'eslint:default',
        'eslint:typescript'
    ]);

    grunt.registerTask('test', 'exec:test');

    grunt.registerTask('coverage', [
        'exec:cover',
        'exec:cover_report',
        'exec:cover_check'
    ]);

    grunt.registerTask('coveralls', 'exec:coveralls');

    grunt.registerTask('docs', ['exec:build_go', 'exec:docs']);

    grunt.registerTask('default', ['lint', 'test']);
};
