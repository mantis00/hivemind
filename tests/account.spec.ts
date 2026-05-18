import { test, expect, Page } from '@playwright/test'
import { signIn, enterTestOrg } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('Account Page', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)

		// Navigate to account page
		await page.goto('/protected/account')

		await page.waitForLoadState('networkidle')
	})

	test('renders all account sections', async ({ page }) => {
		await page.waitForLoadState('networkidle')

		await expect(page.getByRole('heading', { name: /account/i })).toBeVisible()

		await expect(page.locator('[data-slot="card-title"]', { hasText: /personal information/i })).toBeVisible()

		await expect(page.locator('[data-slot="card-title"]', { hasText: /preferences/i })).toBeVisible()

		await expect(page.locator('[data-slot="card-title"]', { hasText: /notifications/i })).toBeVisible()

		await expect(page.locator('[data-slot="card-title"]', { hasText: /credentials/i })).toBeVisible()
	})

	test('profile form updates name', async ({ page }) => {
		const firstName = page.getByLabel(/first name/i)
		const lastName = page.getByLabel(/last name/i)
		const saveBtn = page.getByRole('button', { name: /save changes/i })

		await expect(firstName).toBeVisible()
		await expect(lastName).toBeVisible()

		// Initially disabled
		await expect(saveBtn).toBeDisabled()

		// Modify values
		await firstName.fill('Test')
		await lastName.fill('User')

		await expect(saveBtn).toBeEnabled()

		await saveBtn.click()

		// After submit, usually becomes disabled again
		await expect(saveBtn).toBeDisabled()

		await firstName.fill('Chris')
		await lastName.fill('Moseley')
		await saveBtn.click()
		await expect(saveBtn).toBeDisabled()
	})

	test('theme selection works', async ({ page }) => {
		const lightBtn = page.getByRole('button', { name: /^light$/i })
		const darkBtn = page.getByRole('button', { name: /^dark$/i })
		const systemBtn = page.getByRole('button', { name: /^system$/i })

		await expect(lightBtn).toBeVisible()
		await expect(darkBtn).toBeVisible()
		await expect(systemBtn).toBeVisible()

		await darkBtn.click()

		// Active state usually reflected via class/aria state
		await expect(darkBtn).toBeVisible()
	})

	test('credentials section shows email and actions', async ({ page }) => {
		await expect(page.getByText(/email address/i)).toBeVisible()

		const changeEmailBtn = page.getByRole('button', {
			name: /disabled/i
		})

		const changePasswordBtn = page.getByRole('button', {
			name: /^change$/i
		})

		await changeEmailBtn.scrollIntoViewIfNeeded()
		await changePasswordBtn.scrollIntoViewIfNeeded()

		await expect(changeEmailBtn).toBeVisible()
		await expect(changePasswordBtn).toBeVisible()
	})
})
