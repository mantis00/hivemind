import { spawnSync } from 'node:child_process'
import { createSerwistRoute } from '@serwist/turbopack'
import type { NextRequest } from 'next/server'

const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout ?? crypto.randomUUID()

const serwist = createSerwistRoute({
	additionalPrecacheEntries: [{ url: '/~offline', revision }],
	swSrc: 'app/sw.ts',
	useNativeEsbuild: true
})

// These MUST be static literals for Turbopack
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

// Type bridge for Next 16 catch-all
export const GET = async (request: NextRequest, context: { params: Promise<{ path: string[] }> }) => {
	const resolvedParams = await context.params

	return serwist.GET(request as unknown as Request, {
		params: Promise.resolve({
			path: resolvedParams.path.join('/')
		})
	})
}
