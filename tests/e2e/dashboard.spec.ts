import { test, expect } from "@playwright/test";

const projects = [
  {
    id: "prj_alumni",
    name: "alumni-weekend",
    framework: null,
    updatedAt: Date.UTC(2026, 0, 15),
    passport: { connectorId: "conn_okta", deploymentType: "all" },
    targets: { production: { alias: ["alumni.example.com"] } },
    latestDeployments: [{ readyState: "READY" }],
  },
  {
    id: "prj_research",
    name: "research-demo",
    framework: null,
    updatedAt: Date.UTC(2026, 1, 2),
    targets: { production: { alias: ["research.example.com"] } },
    latestDeployments: [{ readyState: "ERROR" }],
  },
];

const connectors = {
  clients: [
    {
      id: "conn_okta",
      name: "Stanford Okta",
      uid: "stanford.okta.com/passport",
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("https://api.vercel.com/v9/projects**", async (route) => {
    await route.fulfill({ json: { projects } });
  });

  await page.route("https://api.vercel.com/v1/connect/connectors**", async (route) => {
    await route.fulfill({ json: connectors });
  });
});

test("shows Vercel protection metrics and connector details", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Passport Admin" })).toBeVisible();
  await expect(page.getByText("Protection status across all microsites")).toBeVisible();

  await expect(page.getByText("Microsites").locator("..")).toContainText("2");
  await expect(page.getByText("Protected").locator("..")).toContainText("1");
  await expect(page.getByText("Unprotected").locator("..")).toContainText("1");

  await expect(page.getByRole("row", { name: /alumni-weekend/ })).toContainText("Protected");
  await expect(page.getByRole("row", { name: /alumni-weekend/ })).toContainText("Stanford Okta");
  await expect(page.getByRole("row", { name: /alumni-weekend/ })).toContainText("stanford.okta.com");
  await expect(page.getByRole("link", { name: "alumni.example.com" })).toHaveAttribute(
    "href",
    "https://alumni.example.com",
  );

  await expect(page.getByRole("row", { name: /research-demo/ })).toContainText("Unprotected");
  await expect(page.getByRole("row", { name: /research-demo/ })).toContainText("error");
});

test("filters the microsite table by status and search", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Protected" }).click();
  await expect(page.getByRole("row", { name: /alumni-weekend/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /research-demo/ })).toBeHidden();

  await page.getByRole("button", { name: "Unprotected" }).click();
  await expect(page.getByRole("row", { name: /research-demo/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /alumni-weekend/ })).toBeHidden();

  await page.getByRole("button", { name: "All" }).click();
  await page.getByPlaceholder("Search microsites…").fill("okta");
  await expect(page.getByRole("row", { name: /alumni-weekend/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /research-demo/ })).toBeHidden();

  await page.getByPlaceholder("Search microsites…").fill("missing");
  await expect(page.getByText("No microsites match.")).toBeVisible();
});
