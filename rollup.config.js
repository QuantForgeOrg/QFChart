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
// import { typescriptPaths } from 'rollup-plugin-typescript-paths'; // Not strictly needed if using esbuild/dts usually, but keeping compatible
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import dts from 'rollup-plugin-dts';

const build = process.env.BUILD || 'dev';
const isProd = build === 'prod';

// rollup plugin to add the license header to the code
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

const sharedPlugins = [
    json(),
    replace({
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
        preventAssignment: true,
    }),
    resolve({
        preferBuiltins: false,
        browser: true,
        extensions: ['.js', '.ts', '.json'],
    }),
    commonjs(),
    esbuild({
        sourceMap: !isProd,
        minify: isProd,
        target: 'es2020',
    }),
    addSPDXHeader(),
    !isProd ? sourcemaps() : null,
].filter(Boolean);

// 1. ESM Build (For Bundlers - Vite/Webpack)
const ESMConfig = {
    input: './src/index.ts',
    external: ['echarts'],
    output: {
        file: isProd ? './dist/qfchart.min.es.js' : './dist/qfchart.dev.es.js',
        format: 'es',
        sourcemap: !isProd,
    },
    plugins: sharedPlugins,
};

// 2. UMD Build (For Script Tags)
const BrowserConfig = {
    input: './src/index.ts',
    external: ['echarts'],
    output: {
        file: isProd ? './dist/qfchart.min.browser.js' : './dist/qfchart.dev.browser.js',
        format: 'umd',
        name: 'QFChart',
        exports: 'auto',
        sourcemap: !isProd,
        globals: {
            echarts: 'echarts',
        },
    },
    plugins: sharedPlugins,
};

// 3. Types Build
const DtsConfig = {
    input: './src/index.ts',
    external: ['echarts'],
    output: {
        file: './dist/index.d.ts',
        format: 'es',
    },
    plugins: [dts()],
};

export default [ESMConfig, BrowserConfig, DtsConfig];
