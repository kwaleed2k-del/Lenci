import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globals: false,
		environment: 'node',
		alias: {
			'next/server': path.resolve(__dirname, 'tests/mocks/next-server.ts')
		},
		setupFiles: ['tests/vitest.setup.ts']
	}
});


