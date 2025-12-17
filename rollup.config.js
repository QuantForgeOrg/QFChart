const LicenseHeader = `
/* 
 * Copyright (C) 2025 Alaa-eddine KADDOURI
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */`;

import json from '@rollup/plugin-json';
import esbuild from 'rollup-plugin-esbuild';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import dts from 'rollup-plugin-dts';

const build = process.env.BUILD || 'dev';

//rollup plugin to add the license header to the code
function addSPDXHeader() {
    return {
        name: 'add-license-header',
        generateBundle(options, bundle) {
            for (const fileName in bundle) {
                const chunk = bundle[fileName];
                if (chunk.type === 'chunk') {
                    const code = chunk.code;
                    chunk.code = `${LicenseHeader}\n${code}`;
                }
            }
        },
    };
}

const BrowserConfigDev = {
    input: './src/index.ts',
    output: {
        file: './dist/qfchart.dev.browser.js',
        format: 'umd',
        name: 'QFChart',
        exports: 'auto',
        sourcemap: true,
    },
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify(build === 'dev' ? 'development' : 'production'),
            preventAssignment: true,
        }),
        resolve({
            preferBuiltins: true,
            extensions: ['.js', '.ts', '.json'],
            browser: true,
        }),
        commonjs(),
        //typescriptPaths({
        //    tsconfig: './tsconfig.json',
        //    preserveExtensions: true,
        //    nonRelative: false,
        //}),
        esbuild({
            sourceMap: true,
            minify: false,
            treeShaking: false,
            target: 'es2020',
        }),
        addSPDXHeader(),
        sourcemaps(),
    ],
};

const BrowserConfigProd = {
    input: './src/index.ts',
    output: {
        file: './dist/qfchart.min.browser.js',
        format: 'umd',
        name: 'QFChart',
        exports: 'auto',
        sourcemap: false,
    },
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify(build === 'dev' ? 'development' : 'production'),
            preventAssignment: true,
        }),
        resolve({
            preferBuiltins: true,
            extensions: ['.js', '.ts', '.json'],
            browser: true,
        }),
        commonjs(),
        //typescriptPaths({
        //    tsconfig: './tsconfig.json',
        //    preserveExtensions: true,
        //    nonRelative: false,
        //}),
        esbuild({
            sourceMap: false,
            minify: true,
            treeShaking: true,
            target: 'es2020',
        }),
        addSPDXHeader(),
    ],
};

// TypeScript declarations bundling configuration
const DtsConfig = {
    input: './src/index.ts',
    output: {
        file: './dist/index.d.ts',
        format: 'es',
    },
    plugins: [dts()],
};

// Export both the JavaScript bundle and the TypeScript declarations bundle
let config = build === 'dev' ? [BrowserConfigDev, DtsConfig] : [BrowserConfigProd, DtsConfig];

export default config;
