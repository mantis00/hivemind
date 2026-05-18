import { expect, Page } from '@playwright/test'

const email = 'chrisrmoseley1@gmail.com'
const password = 'password'

export async function signIn(page: Page) {
	await page.goto('/auth/login')

	await page.getByLabel('Email').fill(email)
	await page.getByLabel('Password').fill(password)
	await page.getByRole('button', { name: 'Login' }).click()

	await page.waitForURL(/\/protected\/orgs/)
	await expect(page.getByRole('heading', { name: 'Your organizations' })).toBeVisible()
}

export async function enterTestOrg(page: Page) {
	const cards = page.locator('div[data-slot="card"]')
	await expect(cards.first()).toBeVisible()

	const cardCount = await cards.count()

	for (let i = 0; i < cardCount; i++) {
		const card = cards.nth(i)
		const name = await card.locator('p.font-semibold').first().textContent()

		if (name?.trim() === 'test') {
			await card.getByRole('button', { name: 'Enter' }).click()
			break
		}
	}

	await expect(page).toHaveURL(/6ea66b9e-c063-4ee1-8a94-1bdfd1bcf297/)
}
