import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { signIn, enterTestOrg } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

async function goToEnclosures(page: Page) {
	await page
		.getByRole('link', { name: /enclosures/i })
		.first()
		.click()
	await expect(page).toHaveURL(/enclosures/)

	// Wait for page content
	await expect(page.getByRole('button', { name: /add enclosure/i })).toBeVisible()
}

async function expandSecondSpecies(page: Page) {
	const species = page.locator('[data-slot="collapsible-trigger"]')

	// wait until at least 2 species exist
	await expect.poll(async () => await species.count(), { timeout: 15000 }).toBeGreaterThan(1)

	const secondSpecies = species.nth(1)
	await secondSpecies.click()

	return secondSpecies
}

async function createMantisEnclosure(page: Page) {
	await page.getByRole('button', { name: /add enclosure/i }).click()

	const speciesInput = page.getByPlaceholder('Search species...')
	await expect(speciesInput).toBeVisible()

	await speciesInput.fill('Aleous ox beetle')

	const option = page.getByText('Aleous ox beetle').first()
	await expect(option).toBeVisible()
	await option.click()

	const locationInput = page.getByPlaceholder('Search locations...')
	await expect(locationInput).toBeVisible()

	await locationInput.fill('inside')

	const locationOption = page.getByText(/^inside$/).first()
	await expect(locationOption).toBeVisible()
	await locationOption.click()

	const countInput = page.getByPlaceholder('Count')
	await countInput.fill('10')

	await page.getByRole('button', { name: 'Create Enclosure' }).click()

	await expect(page.getByText('Enclosure created')).toBeVisible()
}

test.describe('Authentication', () => {
	test('has title on login page', async ({ page }) => {
		await page.goto('/auth/login')
		await expect(page).toHaveTitle(/Hivemind/)
	})

	test('successful login', async ({ page }) => {
		await signIn(page)
	})

	test('failed login', async ({ page }) => {
		await page.goto('/auth/login')
		await page.getByLabel('Email').fill('invalid@example.com')
		await page.getByLabel('Password').fill('wrongpassword')
		await page.getByRole('button', { name: 'Login' }).click()

		await expect(page).toHaveURL(/\/auth\/login/)
	})
})

test.describe('Enclosures and Species', () => {
	test('view enclosures page after entering test org', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)
	})

	test('create enclosure with African Mantis', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await createMantisEnclosure(page)
	})

	test('set last enclosure inactive (specific species)', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		// Expand correct species
		const species = page.getByRole('button', { name: /aleous ox beetle/i })
		await expect(species).toBeVisible({ timeout: 15000 })
		await species.click()

		await page.getByRole('button', { name: 'Select' }).click()

		// Wait for checkboxes
		const checkboxes = page.getByRole('checkbox')
		await expect(checkboxes.first()).toBeVisible()

		// Select last enclosure
		await checkboxes.last().check()

		// Open dialog
		await page
			.getByRole('button', { name: /^set inactive$/i })
			.first()
			.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Confirm action
		await page
			.getByRole('button', { name: /^set inactive$/i })
			.last()
			.click()

		// Ensure dialog closes
		await expect(dialog).toBeHidden()

		// Verify result
		await expect(page.getByText('Enclosures set to inactive.', { exact: true }).first()).toBeVisible()
	})

	test('cannot set inactive with no selection', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await page.getByRole('button', { name: 'Select' }).click()

		await expect(page.getByRole('button', { name: /set inactive/i })).toBeHidden()
	})

	test('select all enclosures in a species', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await expandSecondSpecies(page)

		await page.getByRole('button', { name: 'Select' }).click()
		await page.getByText(/select all/i).click()

		const checkboxes = page.getByRole('checkbox')
		const count = await checkboxes.count()

		for (let i = 0; i < count; i++) {
			await expect(checkboxes.nth(i)).toBeChecked()
		}
	})

	test('inactive enclosure appears in inactive filter', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await page.getByRole('combobox').first().click()
		await page.getByText('Inactive Enclosures').click()

		await expandSecondSpecies(page)

		await expect(page.getByText('Inactive', { exact: true }).first()).toBeVisible()
	})

	test('cancel set inactive does not change data', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await expandSecondSpecies(page)

		await page.getByRole('button', { name: 'Select' }).click()

		const checkbox = page.getByRole('checkbox').first()
		await checkbox.check()

		await page
			.getByRole('button', { name: /set inactive/i })
			.first()
			.click()
		await page.getByRole('button', { name: /cancel/i }).click()

		await expect(checkbox).toBeChecked()
	})

	test('exiting select mode clears selection', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await expandSecondSpecies(page)

		const selectBtn = page.getByRole('button', { name: 'Select' })

		await selectBtn.click()

		const checkbox = page.getByRole('checkbox').first()
		await checkbox.check()

		await selectBtn.click()
		await selectBtn.click()

		await expect(checkbox).not.toBeChecked()
	})

	test('species row expands and collapses', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		const species = page.locator('[data-slot="collapsible-trigger"]:visible')

		// wait for species to actually load (not just visible)
		await expect.poll(async () => await species.count(), { timeout: 15000 }).toBeGreaterThan(0)

		const firstSpecies = species.first()
		await expect(firstSpecies).toBeVisible()

		await firstSpecies.click()

		const enclosureList = page.locator('[class*="rounded-md border bg-background"]')
		await expect(enclosureList).toBeVisible()

		await firstSpecies.click()
		await expect(enclosureList).toBeHidden()
	})

	test('search filters species', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await page.getByPlaceholder('Search...').fill('mantis')

		await expect(page.getByRole('button', { name: /mantis/i })).toBeVisible({ timeout: 10000 })
	})
})
