import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const email = 'moseleyc@iastate.edu'
const password = 'password'

async function signIn(page: Page) {
	await page.goto('/auth/login')
	await page.getByLabel('Email').fill(email)
	await page.getByLabel('Password').fill(password)
	await page.getByRole('button', { name: 'Login' }).click()
	await page.waitForURL(/\/protected\/orgs/)
	await expect(page.getByRole('heading', { name: 'Your organizations' })).toBeVisible()
}

async function enterTestOrg(page: Page) {
	await expect(page.getByRole('heading', { name: 'Your organizations' })).toBeVisible()

	// Wait for cards to be present in the DOM
	await page.locator('div[data-slot="card"]').first().waitFor({ state: 'visible', timeout: 30000 })

	// Find the card containing "test" org name and click its Enter button
	const cards = page.locator('div[data-slot="card"]')
	const cardCount = await cards.count()

	// Check each card's org name
	for (let i = 0; i < cardCount; i++) {
		const card = cards.nth(i)
		const orgName = card.locator('p.font-semibold').first()
		const name = await orgName.textContent()

		if (name?.trim() === 'test') {
			await expect(card).toBeVisible()
			const enterButton = card.getByRole('button', { name: 'Enter' })
			await enterButton.click()
			break
		}
	}
	await expect(page).toHaveURL(/06e86d02-76f8-412b-910f-e03f61a24f02/, { timeout: 30000 })
}

async function goToEnclosures(page: Page) {
	// Click the sidebar "Enclosures" link (first match)
	const enclosureLinks = page.getByRole('link', { name: /enclosures/i })
	await enclosureLinks.first().click()
	await expect(page).toHaveURL(/enclosures/, { timeout: 10000 })
	await page.waitForLoadState('networkidle')
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

		// Click Add Enclosure button
		await page.getByRole('button', { name: /add enclosure/i }).click()
		console.log('Clicked Add Enclosure button')

		// Wait for the dialog species input to be visible
		const speciesInput = page.getByPlaceholder('Search species...')
		await expect(speciesInput).toBeVisible({ timeout: 30000 })
		console.log('✓ Species search input visible')

		// Select African Mantis species from dropdown
		await speciesInput.fill('African Mantis')
		await page.waitForTimeout(1000)

		const speciesDropdown = page.locator('[data-slot="combobox-content"]').first()
		await expect(speciesDropdown).toBeVisible({ timeout: 5000 })
		const africaMantisOption = speciesDropdown.getByText('African Mantis').first()
		await expect(africaMantisOption).toBeVisible({ timeout: 5000 })
		await africaMantisOption.click()
		console.log('✓ Selected African Mantis from dialog dropdown')

		// Wait for the location input to appear
		await page.waitForTimeout(1000)

		// Select location - based on the dialog text showing "Search locations..."
		const locationInput = page.locator('input[placeholder="Search locations..."]')
		await expect(locationInput).toHaveCount(1, { timeout: 5000 })
		await expect(locationInput.first()).toBeVisible({ timeout: 5000 })
		console.log('✓ Location search input visible')

		await locationInput.fill('inside')
		await page.waitForTimeout(400)

		const visibleLocationDropdown = page
			.locator('[data-slot="combobox-content"]')
			.filter({ hasText: /^inside$/ })
			.first()
		if ((await visibleLocationDropdown.count()) === 0) {
			console.log(
				'Visible location dropdown not found by exact option text, falling back to any visible combobox content'
			)
			const fallback = page.locator('[data-slot="combobox-content"]:visible').first()
			await expect(fallback).toBeVisible({ timeout: 5000 })
			const insideOption = fallback.getByText('inside').first()
			await expect(insideOption).toBeVisible({ timeout: 5000 })
			await insideOption.click({ force: true })
		} else {
			await expect(visibleLocationDropdown).toBeVisible({ timeout: 5000 })
			const insideOption = visibleLocationDropdown.getByText('inside').first()
			await expect(insideOption).toBeVisible({ timeout: 5000 })
			await insideOption.click({ force: true })
		}
		console.log('✓ Selected location: inside')

		// Enter count "10"
		const countInput = page.getByPlaceholder('Count')
		await expect(countInput).toBeVisible({ timeout: 5000 })
		await countInput.fill('10')
		console.log('✓ Entered count: 10')

		// Click Create Enclosure button
		await page.getByRole('button', { name: 'Create Enclosure' }).click()
		console.log('Clicked Create Enclosure')

		// Verify enclosure was created with success message
		await expect(page.getByText('Enclosure created')).toBeVisible({ timeout: 10000 })
		console.log('✓ Enclosure created')
	})

	test('set last enclosure inactive', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		// Enable select mode
		await page.getByRole('button', { name: 'Select' }).click()

		// Wait for species rows (FIXED)
		const speciesButtons = page.locator('[data-slot="collapsible-trigger"]:visible')
		await expect(speciesButtons.first()).toBeVisible({ timeout: 10000 })

		// Expand FIRST species
		await speciesButtons.first().click()

		// Wait for checkboxes (BEST SIGNAL enclosures loaded)
		const checkboxes = page.getByRole('checkbox')
		await expect(checkboxes.first()).toBeVisible()

		// Select LAST enclosure
		await checkboxes.last().check()

		// Click "Set Inactive"
		await page
			.getByRole('button', { name: /^set inactive$/i })
			.first()
			.click()

		// Confirm dialog
		await page
			.getByRole('button', { name: /^set inactive$/i })
			.last()
			.click()

		// Verify dialog closed
		await expect(page.getByRole('button', { name: /^set inactive$/i })).toHaveCount(1)
	})

	test('cannot set inactive with no selection', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await page.getByRole('button', { name: 'Select' }).click()

		const setInactiveBtn = page.getByRole('button', { name: /set inactive/i })

		await expect(setInactiveBtn).toBeHidden({ timeout: 5000 })
	})

	test('select all enclosures in a species', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await page.getByRole('button', { name: 'Select' }).click()

		const species = page.locator('[data-slot="collapsible-trigger"]:visible').first()
		await species.click()

		const selectAll = page.getByText(/select all/i)
		await selectAll.click()

		const checkboxes = page.getByRole('checkbox')
		for (let i = 0; i < (await checkboxes.count()); i++) {
			await expect(checkboxes.nth(i)).toBeChecked()
		}
	})

	test('inactive enclosure appears in inactive filter', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		// Switch filter
		await page.getByRole('combobox').first().click()
		await page.getByText('Inactive Enclosures').click()

		// Expect at least one enclosure exists
		// Wait for species rows (FIXED)
		const speciesButtons = page.locator('[data-slot="collapsible-trigger"]:visible')
		await expect(speciesButtons.first()).toBeVisible({ timeout: 10000 })

		// Expand FIRST species
		await speciesButtons.first().click()

		await page.waitForTimeout(3000)

		await expect(page.getByText('Inactive', { exact: true }).first()).toBeVisible()
	})

	test('cancel set inactive does not change data', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await page.getByRole('button', { name: 'Select' }).click()

		const species = page.locator('[data-slot="collapsible-trigger"]:visible').first()
		await species.click()

		const checkbox = page.getByRole('checkbox').first()
		await checkbox.check()

		await page
			.getByRole('button', { name: /set inactive/i })
			.first()
			.click()

		// Cancel instead
		await page.getByRole('button', { name: /cancel/i }).click()

		// Ensure still selected (not cleared)
		await page.waitForTimeout(3000)
		await expect(checkbox).toBeChecked()
	})

	test('exiting select mode clears selection', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		const selectBtn = page.getByRole('button', { name: 'Select' })
		await selectBtn.click()

		const species = page.locator('[data-slot="collapsible-trigger"]:visible').first()
		await species.click()

		const checkbox = page.getByRole('checkbox').first()
		await checkbox.check()

		// Exit select mode
		await selectBtn.click()

		// Re-enter
		await selectBtn.click()

		await expect(checkbox).not.toBeChecked()
	})

	test('species row expands and collapses', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		const species = page.locator('[data-slot="collapsible-trigger"]:visible').first()

		await species.click()

		const enclosureList = page.locator('[class*="rounded-md border bg-background"]')
		await expect(enclosureList).toBeVisible()

		await species.click()
		await expect(enclosureList).toBeHidden()
	})

	test('search filters species', async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)
		await goToEnclosures(page)

		await page.getByPlaceholder('Search...').fill('mantis')

		await expect(page.getByRole('button', { name: /mantis/i }).first()).toBeVisible()
	})
})
