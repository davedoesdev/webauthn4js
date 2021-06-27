/*eslint-env node */

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
                'jme schemas/schemas.autogen.json schemas/schemas.doc.json > schemas/schemas.json',
                "json2ts --no-resolve --bannerComment '/** @module webauthn4js */' < schemas/schemas.json > typescript/webauthn.d.ts"
            ].join('&&'),
            build_ts: [
                'tsc -p typescript',
                // https://github.com/microsoft/TypeScript/issues/18442
                'mv typescript/example.js typescript/example.mjs'
            ].join('&&'),
            test: './node_modules/.bin/wdio',
            cover: "./node_modules/.bin/nyc -x Gruntfile.js -x wdio.conf.js -x wasm_exec.js ./node_modules/.bin/grunt test",
            cover_report: "./node_modules/.bin/nyc report -r lcov -r text -x ''",
            cover_check: './node_modules/.bin/nyc check-coverage --statements 100 --branches 100 --functions 100 --lines 100',
            coveralls: 'cat coverage/lcov.info | coveralls',
            docs: './node_modules/.bin/typedoc index.d.ts'
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

    grunt.registerTask('docs', 'exec:docs');

    grunt.registerTask('default', ['lint', 'test']);
};
