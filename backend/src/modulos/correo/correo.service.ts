import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CorreoService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    } else {
      console.warn(
        '⚠️ Las variables SMTP no están completas; los correos no podrán enviarse.',
      );
    }
  }

  async enviarCodigoIngreso(
    correoDestino: string,
    nombreCompleto: string,
    codigo: string,
  ) {
    const mostrarOtpDesarrollo =
      process.env.EMAIL_TEST_MODE === 'true' &&
      process.env.NODE_ENV === 'development';

    if (mostrarOtpDesarrollo) {
      console.log('==================================================');
      console.log(`✉️ [EMAIL_TEST_MODE] Destinatario real: ${correoDestino}`);
      console.log(`👤 Para: ${nombreCompleto}`);
      console.log(`🔑 CÓDIGO OTP GENERADO: ${codigo}`);
      console.log('==================================================');
    }

    if (!this.transporter) {
      console.error('❌ Transporter SMTP no configurado.');
      throw new InternalServerErrorException(
        'El servidor de correo no está configurado correctamente.',
      );
    }

    try {
      const html = `
        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
          <div style="max-width:600px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #ddd;">
            <div style="background:#0f1f16; color:white; padding:20px; text-align:center;">
              <h2 style="margin:0;">Plataforma EMSE</h2>
              <p style="margin:5px 0 0;">Verificación de acceso institucional</p>
            </div>
            <div style="padding:30px; color:#222;">
              <p>Sr(a).: <strong>${nombreCompleto}</strong></p>
              <p>El código de ingreso para su cuenta es:</p>
              <div style="font-size:34px; font-weight:bold; letter-spacing:7px; color:#0f1f16; text-align:center; margin:25px 0;">${codigo}</div>
              <p>Este código será válido durante <strong>10 minutos</strong>.</p>
              <p style="font-size:13px; color:#777;">Si usted no solicitó este acceso, ignore este mensaje.</p>
            </div>
            <div style="background:#f0f0f0; padding:15px; text-align:center; font-size:12px; color:#555;">
              Escuela Militar de Sargentos del Ejército - EMSE
            </div>
          </div>
        </div>`;

      const from =
        process.env.SMTP_FROM || '"Plataforma EMSE" <noreply@emse.edu.bo>';
      const info = await this.transporter.sendMail({
        from,
        to: correoDestino,
        subject: 'Código de verificación EMSE',
        html,
      });

      console.log('✉️ [SMTP] Resultado del envío OTP:');
      console.log(`   - messageId: ${info.messageId}`);
      console.log(`   - accepted: ${JSON.stringify(info.accepted)}`);
      console.log(`   - rejected: ${JSON.stringify(info.rejected)}`);

      if (!info.accepted?.length || info.rejected?.length) {
        throw new Error('SMTP no aceptó al destinatario del OTP.');
      }

      return {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error enviando correo OTP vía SMTP:', message);
      throw new InternalServerErrorException(
        `Error al enviar el correo OTP: ${message}`,
      );
    }
  }
}
