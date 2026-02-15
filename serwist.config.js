// @ts-check
const { spawnSync } = require('node:child_process')
const crypto = require('node:crypto')
const { serwist } = require('@serwist/next/config')

const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ?? crypto.randomUUID()

module.exports = serwist({
	swSrc: 'app/sw.ts',
	swDest: 'public/sw.js',
	additionalPrecacheEntries: [{ url: '/~offline', revision }]
})
