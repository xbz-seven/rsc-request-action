// @ts-check

import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { rollup } from "rollup";
import swc from "rollup-plugin-swc3";
import { minify } from "rollup-plugin-esbuild-minify";

const isProduction = !process.argv.includes("--dev");

for (const plug of await readdir("./plugins")) {
    const manifest = JSON.parse((await readFile(`./plugins/${plug}/manifest.json`)).toString());
    const outPath = `./dist/builds/${manifest.id}/index.js`;

    const globalMap = {
        "react": "React",
        "react/jsx-runtime": "bunny._jsx",
    };

    try {
        const bundle = await rollup({
            input: `./plugins/${plug}/${manifest.main}`,
            external: [/^@bunny+/, ...Object.keys(globalMap)],
            plugins: [
                swc({
                    jsc: {
                        target: undefined,
                        transform: {
                            react: {
                                runtime: "automatic",
                            }
                        },
                    },
                    env: {
                        targets: "fully supports es6",
                        include: [
                            "transform-block-scoping",
                            "transform-classes",
                            "transform-async-to-generator",
                            "transform-async-generator-functions"
                        ],
                        exclude: [
                            "transform-parameters",
                            "transform-template-literals",
                            "transform-exponentiation-operator",
                            "transform-named-capturing-groups-regex",
                            "transform-nullish-coalescing-operator",
                            "transform-object-rest-spread",
                            "transform-optional-chaining",
                            "transform-logical-assignment-operators"
                        ]
                    },
                }),
                minify(),
            ]
        });

        await bundle.write({
            file: outPath,
            globals(id) {
                if (id.startsWith("@bunny")) {
                    return id.substring(1).replace(/\//g, ".");
                }
                return globalMap[id] || null;
            },
            format: "iife",
            compact: true,
            exports: "default",
            name: "plugin"
        });

        await bundle.close();
    } catch (error) {
        console.error(`failed building ${manifest.id}:`, error);
        process.exit(1);
    }
}
