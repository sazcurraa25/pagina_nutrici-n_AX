import { expect, test } from "@playwright/test";

test.describe("Flujo de reserva (modo demo)", () => {
  test("reserva un turno de principio a fin", async ({ page }) => {
    await page.goto("/");

    // Paso 1: tipo de consulta.
    await page.getByRole("button", { name: /Primera consulta/ }).click();

    // Paso 2: elegir el primer día con disponibilidad en el calendario.
    await expect(page.getByRole("grid")).toBeVisible();
    await page.locator('button[data-key][aria-disabled="false"]').first().click();

    // Elegir el primer horario libre (chips con la hora).
    const slot = page.getByRole("button", { name: /^\d{2}:\d{2} h/ }).first();
    await expect(slot).toBeVisible();
    await slot.click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 3: datos.
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
    await page.getByLabel("Nombre y apellido").fill("Persona Demo");
    await page.getByLabel("Email").fill("demo@example.com");
    await page.getByLabel("Teléfono (WhatsApp)").fill("221 555 1234");
    // Si la franja permite ambas modalidades, aparecen radios: elegir una.
    const presencial = page.getByRole("radio", { name: /Presencial/ });
    if (await presencial.count()) await presencial.first().check();
    await page.getByLabel(/Acepto que mis datos/).check();
    await page.getByRole("button", { name: "Revisar turno" }).click();

    // Paso 4: confirmar.
    await expect(page.getByRole("heading", { name: /Revisá y confirmá/ })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar turno" }).click();

    // Confirmación.
    await expect(page).toHaveURL(/\/turno\/confirmado/);
    await expect(page.getByRole("heading", { name: /turno está confirmado/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cancelá tu turno/ })).toBeVisible();
  });

  test("no deja avanzar sin completar los datos obligatorios", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Consulta online/ }).click();
    await expect(page.getByRole("grid")).toBeVisible();
    await page.locator('button[data-key][aria-disabled="false"]').first().click();
    const slot = page.getByRole("button", { name: /^\d{2}:\d{2} h/ }).first();
    await expect(slot).toBeVisible();
    await slot.click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Enviar vacío → mensajes de error y sin cambio de paso.
    await page.getByRole("button", { name: "Revisar turno" }).click();
    await expect(page.getByText("Ingresá tu nombre y apellido")).toBeVisible();
    await expect(page.getByText("Necesitamos tu consentimiento para agendar el turno")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
  });
});
