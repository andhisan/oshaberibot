import * as fs from "node:fs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import type { RollupOptions } from "rollup";
import license from "rollup-plugin-license";

/**
 * @see https://github.com/js-cookie/js-cookie/blob/main/rollup.config.mjs
 */
const loadJSON = (path: string) =>
	JSON.parse(fs.readFileSync(new URL(path, import.meta.url)).toString());

const pkg = loadJSON("./package.json");
const external = [
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.devDependencies || {}),
];

const licenseBanner = license({
	banner: {
		content: "/*! <%= pkg.name %> v<%= pkg.version %> by <%= pkg.author %> */",
		commentStyle: "none",
	},
});

const buildRollupOption = (input: string, dir: string) => {
	return {
		input,
		output: {
			dir,
			format: "es",
			exports: "none",
			sourcemap: true,
		},
		plugins: [
			nodeResolve(),
			typescript({
				declaration: false,
			}),
			replace({
				values: {
					__VERSION__: pkg.version,
				},
				preventAssignment: true,
			}),
			terser(),
			licenseBanner,
		],
		external,
	} satisfies RollupOptions;
};

const config: RollupOptions[] = [buildRollupOption("src/main.ts", "dist")];

export default config;
