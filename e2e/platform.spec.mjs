import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
async function demo(page, role) {
  await page.goto('/login');
  await page.getByRole('button', { name: role, exact: true }).click();
  await expect(page).toHaveURL(
    role === 'Donor' ? /\/dashboard$/ : role === 'Admin' ? /\/admin$/ : /\/organization$/,
  );
  await expect(page.locator('.dash-loading')).toHaveCount(0);
}
async function noOverflow(page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
}
async function photosReady(page) {
  await expect
    .poll(() =>
      page
        .locator('img')
        .evaluateAll((images) => images.every((i) => i.complete && i.naturalWidth > 0)),
    )
    .toBe(true);
}

test('public discovery, category/search filters, route states, and portfolio screenshots', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('screenshots', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Small acts. Shared change.' })).toBeVisible();
  await expect(page.locator('.campaign-card')).toHaveCount(3);
  await photosReady(page);
  await noOverflow(page);
  await page.screenshot({ path: 'screenshots/home-desktop.png', fullPage: true });
  await page.screenshot({ path: 'screenshots/preview.png' });
  await page.goto('/campaigns');
  await expect(page.locator('.campaign-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Education', exact: true }).click();
  await expect(page.locator('.campaign-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Education for Every Child' })).toBeVisible();
  await page.getByRole('button', { name: 'All causes', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search campaigns' }).fill('no-such-campaign');
  await expect(page.getByRole('heading', { name: 'No campaigns found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.campaign-card')).toHaveCount(6);
  await page.getByRole('link', { name: 'Education for Every Child', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Education for Every Child', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.donation-row')).toHaveCount(3);
  await photosReady(page);
  await page.screenshot({ path: 'screenshots/campaign-desktop.png', fullPage: true });
  await demo(page, 'Donor');
  await expect(page.getByText('Sample', { exact: true })).toHaveCount(2);
  await page.screenshot({ path: 'screenshots/dashboard-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.goto('/missing-route');
  await expect(page.getByRole('heading', { name: 'Let’s find your way back.' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.campaign-card')).toHaveCount(3);
  await photosReady(page);
  await noOverflow(page);
  await page.screenshot({ path: 'screenshots/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Discover causes' }).click();
  await expect(page).toHaveURL(/\/campaigns$/);
  await noOverflow(page);
  for (const route of [
    '/campaigns/education-every-child',
    '/volunteer',
    '/volunteer/food-distribution',
    '/login',
  ]) {
    await page.goto(route);
    await expect(page.locator('.loading')).toHaveCount(0);
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});

test('registration, profile update, logout and password login', async ({ page }) => {
  const email = `portfolio-${Date.now()}@example.org`;
  await page.goto('/register');
  await page.getByLabel('Full name', { exact: true }).fill('Taylor Volunteer');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.locator('input[name="password"]').fill('LocalDemoPassword123!');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Hello, Taylor.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Location', { exact: true }).fill('Pune, Maharashtra');
  await page
    .getByLabel('A little about you', { exact: true })
    .fill('Happy to support education and community gardens.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Your profile has been updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.locator('input[name="password"]').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  await page.locator('input[name="password"]').fill('LocalDemoPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Happy to support education and community gardens.')).toBeVisible();
});

test('simulated donation updates a second browser and private history without refresh', async ({
  page,
  browser,
  request,
}) => {
  const observer = await browser.newPage();
  await observer.goto('http://localhost:5174/campaigns/education-every-child');
  await expect(observer.locator('.detail-raised')).toContainText('₹');
  const before = await (
    await request.get('http://localhost:5100/api/campaigns/education-every-child')
  ).json();
  await demo(page, 'Donor');
  await page.goto('/campaigns/education-every-child');
  await page.getByRole('spinbutton', { name: 'Donation amount in rupees' }).fill('500');
  await page.getByLabel('Show my donation as anonymous').check();
  await page.getByRole('button', { name: 'Donate ₹500', exact: true }).click();
  await expect(page.getByText('SIMULATED CHECKOUT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm demo donation' }).click();
  await expect(page.getByRole('heading', { name: 'You made a difference.' })).toBeVisible();
  await expect(observer.locator('.detail-raised')).toContainText(money(before.raised + 500));
  await expect(observer.locator('.donation-row').first()).toContainText('A kind stranger');
  await page.getByRole('link', { name: 'View your impact' }).click();
  await expect(page.locator('.dash-table tbody tr').first()).toContainText('₹500');
  await expect(page.locator('.dash-table tbody tr').first()).toContainText('Demo');
  await observer.close();
});

test('volunteer applies, organization reviews, and user sees live status', async ({
  page,
  browser,
}) => {
  await demo(page, 'Donor');
  await page.goto('/volunteer/food-distribution');
  await page
    .getByLabel('Why would you like to join?')
    .fill('I can help pack food parcels every weekend and coordinate local volunteers.');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByRole('heading', { name: 'You’re on your way.' })).toBeVisible();
  await page.getByRole('link', { name: 'Track your application' }).click();
  await page.getByRole('tab', { name: /Volunteering/ }).click();
  const application = page
    .locator('.dash-application')
    .filter({ hasText: 'Food Distribution Volunteer' });
  await expect(application.locator('.dash-status')).toHaveText('pending');
  const org = await browser.newPage();
  await demo(org, 'Organization');
  await org.getByRole('tab', { name: /^Applications/ }).click();
  const review = org.locator('.dash-review').filter({ hasText: 'Food Distribution Volunteer' });
  await review.getByRole('combobox').selectOption('accepted');
  await expect(org.getByText('Application marked as accepted.')).toBeVisible();
  await expect(application.locator('.dash-status')).toHaveText('accepted');
  await application.getByRole('button', { name: 'Withdraw' }).click();
  await expect(application.locator('.dash-status')).toHaveText('withdrawn');
  await expect(review.getByRole('combobox')).toHaveValue('withdrawn');
  await org.close();
});

test('organization creates and edits campaigns and volunteer opportunities', async ({ page }) => {
  await demo(page, 'Organization');
  await page.getByRole('button', { name: 'Create campaign', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Campaign title', { exact: true }).fill('Community Learning Library');
  await dialog.getByLabel('Location', { exact: true }).fill('Pune, Maharashtra');
  await dialog
    .getByLabel('Short summary')
    .fill('Help build a welcoming community reading space for young learners.');
  await dialog
    .getByLabel('The story behind your cause')
    .fill(
      'Our volunteers are creating a library with books and learning materials for the local community.',
    );
  await dialog.getByLabel('Fundraising goal (₹)').fill('50000');
  await dialog.getByRole('button', { name: 'Create campaign', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const card = page.locator('.dash-campaign').filter({ hasText: 'Community Learning Library' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Edit campaign' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Fundraising goal (₹)').fill('75000');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(card).toContainText('₹75,000');
  await page.getByRole('tab', { name: /Volunteer opportunities/ }).click();
  await page.getByRole('button', { name: 'New opportunity' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Opportunity title', { exact: true }).fill('Community Library Assistant');
  await dialog.getByLabel('Location', { exact: true }).fill('Pune, Maharashtra');
  await dialog
    .getByLabel('About the opportunity')
    .fill('Help organize books and support our weekend reading circles for local children.');
  await dialog.getByLabel('Start date & time').fill('2027-01-20T10:00');
  await dialog.getByLabel('Volunteer spots').fill('12');
  await dialog.getByLabel('Time commitment').fill('2 hours per week');
  await dialog.getByLabel('Helpful skills').fill('Communication, Teaching');
  await dialog.getByRole('button', { name: 'Create opportunity', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const opportunity = page
    .locator('.dash-opportunity')
    .filter({ hasText: 'Community Library Assistant' });
  await expect(opportunity).toBeVisible();
  await opportunity.getByRole('button', { name: 'Edit', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).selectOption('closed');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(opportunity.locator('.dash-status')).toHaveText('closed');
});

test('admin management changes public status, roles and enabled access', async ({
  page,
  request,
}) => {
  const registered = await request.post('http://localhost:5100/api/auth/register', {
    data: {
      name: 'Casey Reviewer',
      email: 'admin-review@example.org',
      password: 'LocalAdminReview123!',
      role: 'user',
    },
  });
  expect(registered.ok()).toBeTruthy();
  await demo(page, 'Admin');
  await page.getByRole('tab', { name: 'Campaigns', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Status for Green City Plantation Drive' })
    .selectOption('paused');
  await expect(page.getByText('Campaign status updated.')).toBeVisible();
  await page.goto('/campaigns');
  await page.getByRole('link', { name: 'Green City Plantation Drive', exact: true }).click();
  await expect(
    page.getByText('This campaign is paused and is not accepting donations.'),
  ).toBeVisible();
  await page.goto('/admin');
  await page.getByRole('tab', { name: 'People', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Role for Casey Reviewer' })
    .selectOption('organization');
  await expect(page.getByText('Casey Reviewer’s role has been updated.')).toBeVisible();
  const user = page.locator('tbody tr').filter({ hasText: 'Casey Reviewer' });
  await user.getByRole('button', { name: 'Disable', exact: true }).click();
  await expect(user.locator('.dash-status')).toHaveText('Disabled');
  await user.getByRole('button', { name: 'Enable', exact: true }).click();
  await expect(user.locator('.dash-status')).toHaveText('Active');
  await expect(page.getByRole('combobox', { name: 'Role for Jordan Lee' })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
});

test('protected routes reject visitors and unauthorized roles; missing resource recovers', async ({
  page,
}) => {
  await page.goto('/organization');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Donor', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This area is available');
  await page.getByRole('link', { name: 'Your dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/campaigns/nonexistent');
  await expect(page.getByRole('alert')).toContainText('Campaign not found');
  await page.getByRole('link', { name: 'Back to campaigns' }).click();
  await expect(page).toHaveURL(/\/campaigns$/);
});
