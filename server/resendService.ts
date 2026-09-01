import { Resend } from 'resend';
import { Order, SiteConfig } from '../src/types';

export interface SendOrderEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendOrderEmails(order: Order, config: SiteConfig): Promise<SendOrderEmailResult> {
  const apiKey = config.resend?.apiKey?.trim() || process.env.RESEND_API_KEY;
  const fromEmail = config.resend?.senderEmail?.trim() || "onboarding@resend.dev";
  const notifyEmail = config.resend?.notifyEmail?.trim() || "objednavky@luvia-decor.cz";

  if (!apiKey) {
    console.warn("[Resend] No API key provided for Resend email dispatch.");
    return { success: false, error: "Chybí Resend API klíč." };
  }

  const itemsListHtml = order.items.map(item => `
    <tr style="border-bottom: 1px solid #EFEAE3;">
      <td style="padding: 12px 8px; font-size: 14px; color: #2D2723;">
        <strong>${item.title}</strong>
        ${item.customNote ? `<br><span style="font-size: 12px; color: #73675E;">Poznámka: ${item.customNote}</span>` : ''}
      </td>
      <td style="padding: 12px 8px; font-size: 14px; text-align: center; color: #2D2723;">${item.quantity}×</td>
      <td style="padding: 12px 8px; font-size: 14px; text-align: right; color: #2D2723; font-weight: 600;">${(item.price * item.quantity).toLocaleString('cs-CZ')} Kč</td>
    </tr>
  `).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <title>Objednávka ${order.orderNumber} - Luvia Decor</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF8F5; margin: 0; padding: 24px; color: #2D2723;">
      <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #EAE3DB; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
        
        <!-- Header -->
        <div style="background-color: #2D2723; color: #F5EFE6; padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0 0 6px 0; font-family: Georgia, serif; font-size: 26px; letter-spacing: 2px; text-transform: uppercase;">LUVIA DECOR</h1>
          <p style="margin: 0; font-size: 13px; color: #D1C7BC; letter-spacing: 0.5px;">Ručně tvořené dekorace & květinový ateliér Kroměříž</p>
        </div>

        <div style="padding: 30px 24px;">
          <!-- Success Notice -->
          <div style="background-color: #F6F3EE; border-left: 4px solid #8C7355; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #433526;">Objednávka byla úspěšně přijata.</p>
            <p style="margin: 0; font-size: 14px; color: #6E5F52;">Již brzy Vás budeme kontaktovat ohledně dokončení a předání či odeslání.</p>
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #40362F;">
            Vážený zákazníku / Vážená zákaznice <strong>${order.customer.fullName}</strong>,<br>
            děkujeme za Vaši poptávku v ateliéru Luvia Decor. Níže naleznete rekapitulaci Vaší objednávky:
          </p>

          <!-- Order details meta -->
          <div style="background: #FAF8F5; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #5C5046;">
            <strong>Číslo objednávky:</strong> ${order.orderNumber}<br>
            <strong>Datum vytvoření:</strong> ${new Date(order.createdAt).toLocaleString('cs-CZ')}<br>
            <strong>Způsob platby:</strong> Dle domluvy / bez online platby
          </div>

          <!-- Items Table -->
          <h3 style="font-size: 16px; font-family: Georgia, serif; margin: 24px 0 12px 0; border-bottom: 2px solid #F0EAE1; padding-bottom: 8px; color: #2D2723;">
            Položky v objednávce
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #F8F5F0; text-align: left; font-size: 12px; text-transform: uppercase; color: #8A7B6E;">
                <th style="padding: 8px;">Položka</th>
                <th style="padding: 8px; text-align: center;">Množství</th>
                <th style="padding: 8px; text-align: right;">Cena</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 16px 8px 8px 8px; font-weight: 700; font-size: 16px; text-align: right; color: #2D2723;">
                  Celková cena k úhradě:
                </td>
                <td style="padding: 16px 8px 8px 8px; font-weight: 700; font-size: 18px; text-align: right; color: #8C7355;">
                  ${order.totalPrice.toLocaleString('cs-CZ')} Kč
                </td>
              </tr>
            </tfoot>
          </table>

          <!-- Customer Data -->
          <h3 style="font-size: 16px; font-family: Georgia, serif; margin: 24px 0 12px 0; border-bottom: 2px solid #F0EAE1; padding-bottom: 8px; color: #2D2723;">
            Kontaktní a doručovací údaje
          </h3>
          <div style="font-size: 14px; line-height: 1.6; color: #4F433A; background-color: #FAF8F5; padding: 14px 18px; border-radius: 8px;">
            <strong>Jméno a příjmení:</strong> ${order.customer.fullName}<br>
            <strong>E-mail:</strong> ${order.customer.email}<br>
            <strong>Telefon:</strong> ${order.customer.phone}<br>
            <strong>Doručovací adresa:</strong> ${order.customer.street}, ${order.customer.zip} ${order.customer.city}<br>
            ${order.customer.note ? `<strong>Poznámka k objednávce:</strong> ${order.customer.note}` : ''}
          </div>

          <!-- Contact & Support -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EAE3DB; font-size: 13px; color: #7B6E63; line-height: 1.6;">
            V případě jakýchkoliv dotazů se na nás můžete kdykoliv obrátit:<br>
            E-mail na podporu: <a href="mailto:${config.supportEmail}" style="color: #8C7355; text-decoration: none;">${config.supportEmail}</a><br>
            E-mail na objednávky: <a href="mailto:${config.ordersEmail}" style="color: #8C7355; text-decoration: none;">${config.ordersEmail}</a><br>
            Telefon: <a href="tel:${config.phone}" style="color: #8C7355; text-decoration: none;">${config.phoneDisplay}</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #F5EFE6; padding: 20px; text-align: center; font-size: 12px; color: #8A7B6E; border-top: 1px solid #E6DCD1;">
          <p style="margin: 0 0 4px 0;"><strong>Luvia Decor</strong> | Odpovědná osoba: ${config.responsiblePerson}</p>
          <p style="margin: 0 0 4px 0;">Sídlo: ${config.registeredOffice} | IČO: ${config.ico}</p>
          <p style="margin: 0;">© ${new Date().getFullYear()} Luvia Decor. Všechna práva vyhrazena.</p>
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);

    // Send email to the customer
    const customerResponse = await resend.emails.send({
      from: `Luvia Decor <${fromEmail}>`,
      to: [order.customer.email],
      subject: `Potvrzení objednávky ${order.orderNumber} - Luvia Decor`,
      html: emailHtml
    });

    console.log(`[Resend] Order confirmation sent to customer ${order.customer.email}:`, customerResponse);

    // Also attempt sending a notification to orders team if distinct and valid
    if (notifyEmail && notifyEmail !== order.customer.email) {
      try {
        await resend.emails.send({
          from: `Luvia Decor Systém <${fromEmail}>`,
          to: [notifyEmail],
          subject: `🔔 NOVÁ OBJEDNÁVKA: ${order.orderNumber} (${order.customer.fullName} - ${order.totalPrice} Kč)`,
          html: emailHtml
        });
        console.log(`[Resend] Notification sent to shop manager: ${notifyEmail}`);
      } catch (shopErr) {
        console.warn(`[Resend] Notice to shop email skipped or rejected:`, shopErr);
      }
    }

    return {
      success: true,
      messageId: customerResponse.data?.id
    };
  } catch (error: any) {
    console.error("[Resend] Error sending order email:", error);
    return {
      success: false,
      error: error?.message || "Odeslání e-mailu přes Resend selhalo."
    };
  }
}

export async function sendTestEmail(apiKey: string, targetEmail: string, fromEmail = "onboarding@resend.dev"): Promise<{ success: boolean; message: string }> {
  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: `Luvia Decor Test <${fromEmail}>`,
      to: [targetEmail],
      subject: `Test Resend integrace - Luvia Decor (${new Date().toLocaleTimeString('cs-CZ')})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #FAF8F5; color: #2D2723;">
          <h2 style="color: #8C7355;">🌿 Resend API integrace funguje správně!</h2>
          <p>Tento testovací e-mail potvrzuje, že Váš Resend API klíč je platný a připravený k odesílání objednávek zákazníkům Luvia Decor.</p>
          <p style="font-size: 12px; color: #7B6E63;">Odesláno z administrace ateliéru Luvia Decor v Kroměříži.</p>
        </div>
      `
    });

    if (response.error) {
      return { success: false, message: response.error.message };
    }
    return { success: true, message: `E-mail byl úspěšně odeslán na ${targetEmail} (ID: ${response.data?.id})` };
  } catch (err: any) {
    return { success: false, message: err?.message || "Chyba při komunikaci s Resend API." };
  }
}
