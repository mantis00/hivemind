import { test, expect, Page } from '@playwright/test'
import { signIn, enterTestOrg } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('Org Members Page', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)

		// Navigate to account page
		await page.goto('protected/orgs/6ea66b9e-c063-4ee1-8a94-1bdfd1bcf297/members/')

		await page.waitForLoadState('networkidle')
	})

	test('invite member selects user and verifies access levels', async ({ page }) => {
		const inviteBtn = page.getByRole('button', { name: /invite member/i })

		await expect(inviteBtn).toBeVisible()
		await inviteBtn.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		const userSelectBtn = dialog.locator('button', { hasText: /choose a user/i })

		await expect(userSelectBtn).toBeVisible({ timeout: 10000 })
		await userSelectBtn.click()

		const searchInput = page.getByPlaceholder(/search users/i)

		await expect(searchInput).toBeVisible()
		await searchInput.fill('Hivemind Tutorial')

		const firstOption = page.getByRole('option').first()

		await expect(firstOption).toBeVisible()
		await firstOption.click()

		const accessDropdown = dialog.getByRole('combobox', {
			name: /access level/i
		})

		await expect(accessDropdown).toBeVisible()

		// default state check
		await expect(accessDropdown).toContainText(/caretaker/i)

		await accessDropdown.click()

		const ownerOption = page.getByRole('option', { name: /owner/i })

		await expect(ownerOption).toBeVisible()
	})

	test('org member roles and permissions are correctly displayed', async ({ page }) => {
		await page.goto('protected/orgs/6ea66b9e-c063-4ee1-8a94-1bdfd1bcf297/members/')

		await page.waitForLoadState('networkidle')

		const cards = page.locator('div').filter({
			has: page.getByRole('paragraph')
		})

		const chrisCard = page.locator('text=Chris Moseley').locator('xpath=ancestor::div[contains(@class,"card")]')

		await expect(chrisCard).toBeVisible()

		// Verify superadmin badge exists
		await expect(chrisCard.getByText(/superadmin/i)).toBeVisible()

		// Verify no kick button on superadmin card
		await expect(chrisCard.getByRole('button', { name: /kick/i })).toHaveCount(0)

		await expect(chrisCard.getByRole('button', { name: /user round x|kick/i })).toHaveCount(0)

		const allCards = page.locator('div.border-l-4')

		const cardCount = await allCards.count()

		let foundCaretakerCard = false

		for (let i = 0; i < cardCount; i++) {
			const card = allCards.nth(i)

			const badgeText = await card
				.getByText(/caretaker|owner|superadmin/i)
				.textContent()
				.catch(() => '')

			const hasKickButton =
				(await card.getByRole('button', { name: /kick/i }).count()) > 0 ||
				(await card.locator('text=Kick Member').count()) > 0

			if (badgeText?.toLowerCase().includes('caretaker') && hasKickButton) {
				await expect(card.getByText(/caretaker/i)).toBeVisible()
				await expect(card.getByRole('button', { name: /kick/i })).toBeVisible()

				foundCaretakerCard = true
				break
			}
		}

		expect(foundCaretakerCard).toBeTruthy()
	})
})
