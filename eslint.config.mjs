import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
	...coreWebVitals,
	...nextTypescript,
	{
		ignores: [
			'node_modules/**',
			'.next/**',
			'out/**',
			'build/**',
			'next-env.d.ts',
			'tests/**',
			'public/sw.js',
			'public/sw*.js',
			'serwist.config.js'
		]
	}
]

export default config
