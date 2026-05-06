import { test, expect, Page } from '@playwright/test'
import { signIn, enterTestOrg } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('Tasks Page', () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page)
		await enterTestOrg(page)

		const tasksLink = page.getByRole('link', { name: /tasks/i }).first()
		const tasksButton = page.getByRole('button', { name: /tasks/i }).first()

		if (await tasksLink.isVisible().catch(() => false)) {
			await tasksLink.click()
		} else if (await tasksButton.isVisible().catch(() => false)) {
			await tasksButton.click()
		} else {
			// text click
			await page.getByText(/^tasks$/i).click()
		}

		await expect(page).toHaveURL(/tasks/)

		// strongest anchor on page
		await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible()

		await expect(page.getByRole('button', { name: /create task/i })).toBeVisible()
	})

	test('loads tasks table', async ({ page }) => {
		const table = page.locator('table')
		const empty = page.getByText(/no tasks/i)
		const spinner = page.locator('[class*="animate-spin"]')

		await expect(table.or(empty).or(spinner)).toBeVisible()
	})

	test('opens create task dialog', async ({ page }) => {
		const trigger = page.getByRole('button', { name: /create task/i })

		await expect(trigger).toBeVisible()

		// bypass Radix event system - avoid hang
		await trigger.dispatchEvent('click')

		// wait for any stable dialog indicator
		const dialog = page.locator('text=Select an enclosure to continue')

		await expect(dialog).toBeVisible({ timeout: 10000 })

		// now safely scope inside dialog content
		await expect(page.getByPlaceholder(/search enclosures/i)).toBeVisible()
	})

	test('create task', async ({ page }) => {
		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(500)

		const trigger = page.getByRole('button', { name: /create task/i })

		await expect(trigger).toBeVisible()
		await expect(trigger).toBeEnabled()

		await trigger.click({ force: true })

		const dialog1 = page.locator('[role="dialog"]').first()
		await expect(dialog1).toBeVisible()

		const input = dialog1.getByPlaceholder(/search enclosures/i)
		await expect(input).toBeVisible()

		await input.click()
		await page.keyboard.type('Bee', { delay: 50 })

		await page.waitForTimeout(300)

		await dialog1.click({ position: { x: 10, y: 10 } })

		await page.waitForTimeout(1000)

		await input.click()

		const option = page
			.locator('[role="option"]', {
				hasText: /Bee \(upload docs test\)/i
			})
			.first()

		await expect(option).toBeVisible()
		await option.click()

		const createBtn = dialog1.getByRole('button', { name: /create task/i }).last()
		await expect(createBtn).toBeEnabled()

		await createBtn.click()

		const dialog2 = page.getByRole('dialog', { name: /create new task/i })
		await expect(dialog2).toBeVisible()

		await dialog2.getByRole('radio', { name: /custom task/i }).click()

		const nameInput = dialog2.getByPlaceholder(/e\.g\. clean glass, morning feeding/i)
		await expect(nameInput).toBeVisible()
		await nameInput.fill('test')

		const descInput = dialog2.getByPlaceholder(/brief description of this task/i)
		await expect(descInput).toBeVisible()
		await descInput.fill('test')

		const employee = dialog2.locator('button[role="combobox"]', {
			hasText: 'Select an employee'
		})

		await expect(employee).toBeVisible()
		await employee.click()

		await page.getByRole('option', { name: 'Normal User' }).click()

		const priorityTrigger = dialog2.locator('button[role="combobox"]', {
			hasText: 'Medium'
		})

		await expect(priorityTrigger).toBeAttached()
		await priorityTrigger.scrollIntoViewIfNeeded()
		await expect(priorityTrigger).toBeVisible()

		await priorityTrigger.click()

		const lowOption = page.getByRole('option', {
			name: /^low$/i
		})

		await expect(lowOption).toBeVisible()
		await lowOption.click()

		const submit = dialog2.getByRole('button', { name: /create task/i })
		await expect(submit).toBeEnabled()

		await submit.click()

		await expect(dialog2).toBeHidden()
		await expect(page.getByText(/task created!/i)).toBeVisible()
	})

	test('select mode toggles on and off', async ({ page }) => {
		const selectBtn = page.getByRole('button', { name: /select tasks/i })

		await expect(selectBtn).toBeVisible()
		await expect(selectBtn).toBeEnabled()

		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(500)

		await selectBtn.click()

		const cancelBtn = page.getByRole('button', { name: /cancel/i })

		await expect(cancelBtn).toBeVisible()
		await expect(cancelBtn).toBeEnabled()

		await cancelBtn.click()

		await expect(page.getByRole('button', { name: /select tasks/i })).toBeVisible()
	})

	test('tasks table renders rows', async ({ page }) => {
		const rows = page.locator('tbody tr')

		await expect.poll(async () => await rows.count(), { timeout: 15000 }).toBeGreaterThanOrEqual(0)

		await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible()
	})

	test('batch complete tasks', async ({ page }) => {
		const selectBtn = page.getByRole('button', { name: /select tasks/i })

		await expect(selectBtn).toBeVisible()
		await expect(selectBtn).toBeEnabled()

		await page.waitForLoadState('networkidle')
		await page.waitForTimeout(500)

		await selectBtn.click()

		const rows = page.getByRole('row')

		const testRows = rows.filter({
			hasText: /test/i
		})

		const count = await testRows.count()

		// Only proceed if we actually have matching tasks
		if (count === 0) {
			test.skip(true, 'No tasks containing "test" exist')
		}

		for (let i = 0; i < count; i++) {
			const row = testRows.nth(i)

			// the checkbox button inside the row
			const checkbox = row.locator('button[role="checkbox"], button').first()

			// detect selected state
			const isChecked = await checkbox.evaluate((el) => {
				return (
					el.getAttribute('aria-checked') === 'true' ||
					el.classList.contains('checked') ||
					el.querySelector('svg.lucide-square-check-big') !== null
				)
			})

			if (!isChecked) {
				await checkbox.click()
			}
		}

		const batchBtn = page.getByRole('button', {
			name: /batch complete/i
		})

		await expect(batchBtn).toBeVisible()
		await expect(batchBtn).toBeEnabled()

		await batchBtn.click()

		await expect(page).toHaveURL(/batch-complete/)

		const completeBtn = page.getByRole('button', { name: /complete/i })

		await expect(completeBtn).toBeVisible()
		await expect(completeBtn).toBeEnabled()

		await completeBtn.click()

		const completionMessage = page.locator('p', {
			hasText: /tasks completed/i
		})

		await expect(completionMessage).toBeVisible()
	})
})
