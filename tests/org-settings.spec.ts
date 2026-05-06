import { test, expect, Page } from '@playwright/test'
import { signIn, enterTestOrg } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('Org Settings Page', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)

		await page.goto('protected/orgs/6ea66b9e-c063-4ee1-8a94-1bdfd1bcf297/settings')
		await page.waitForLoadState('networkidle')
	})

	test('renders org settings page', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /organization settings/i })).toBeVisible()

		await expect(page.getByText(/manage your organization/i)).toBeVisible()
	})

	test('shows organization details section', async ({ page }) => {
		const detailsSection = page.getByText(/organization details/i)

		await expect(detailsSection).toBeVisible()
		await expect(page.getByText(/harmless to change/i)).toBeVisible()

		await expect(page.getByText(/change organization name/i)).toBeVisible()
	})

	test('change org name button opens dialog', async ({ page }) => {
		const changeBtn = page
			.getByRole('button', {
				name: /change/i
			})
			.first() // first change is org name

		await expect(changeBtn).toBeVisible()
		await changeBtn.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// check dialog content
		await expect(dialog).toContainText(/organization name/i)
	})

	test('shows danger zone section', async ({ page }) => {
		await expect(page.getByText(/danger zone/i)).toBeVisible()

		await expect(page.getByText(/irreversible actions/i)).toBeVisible()

		await expect(page.locator('p', { hasText: /delete organization/i })).toBeVisible()
	})

	test('delete organization button is visible and opens dialog', async ({ page }) => {
		const deleteBtn = page.getByRole('button', {
			name: /delete/i
		})

		await expect(deleteBtn).toBeVisible()

		await deleteBtn.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Ensure it's actually the delete dialog
		await expect(dialog).toContainText(/delete organization/i)

		// DO NOT confirm delete
	})

	test('org settings section is visible', async ({ page }) => {
		// If this renders, user passed:
		// useIsOwnerOrSuperadmin(orgId)

		await expect(page.getByText(/organization details/i)).toBeVisible()

		await expect(page.getByText(/danger zone/i)).toBeVisible()
	})
})
