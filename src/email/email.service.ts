// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    // CORRECTION : createTransport au lieu de createTransporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

 async sendActivationEmail(email: string, nom: string, password: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: ' Votre compte a été activé - ENI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Gestion de Stock ENI</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre compte a été activé</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${nom},</h2>
            
            <p style="color: #555; line-height: 1.6;">
              Votre demande de compte demandeur a été <strong>approuvée</strong> par l'administrateur.
            </p>
            
            <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #333; margin-top: 0;">Vos identifiants de connexion :</h3>
              <p style="margin: 10px 0;">
                <strong>📧 Email :</strong> ${email}
              </p>
              <p style="margin: 10px 0;">
                <strong>🔑 Mot de passe temporaire :</strong> 
                <span style="background: #fff3cd; padding: 5px 10px; border-radius: 4px; font-family: monospace; font-weight: bold;">
                  ${password}
                </span>
              </p>
            </div>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <p style="color: #155724; margin: 0;">
                <strong>⚠️ Sécurité importante :</strong><br>
                Pour des raisons de sécurité, vous devez <strong>changer votre mot de passe</strong> dès la première connexion.
              </p>
            </div>
            
            <!--  <div style="text-align: center; margin: 30px 0;">
              <!-- CORRECTION : Lien DIRECT vers first-login -->
              <a href="http://localhost:3000/first-login" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                🔗 Changer mon mot de passe maintenant
              </a>
            </div>   
            
            <p style="color: #777; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
              <strong>Instructions :</strong><br>
              1. Cliquez sur le lien ci-dessus<br>
              2. Entrez votre nouveau mot de passe<br>
              3. Vous serez automatiquement connecté à votre compte
            </p>   -->
            
            <p style="color: #777; font-size: 14px;">
              Si vous n'avez pas fait cette demande, veuillez ignorer cet email.<br>
              <strong>Équipe Comptabilité Matière - ENI</strong>
            </p>
          </div>
        </div>
      `,
    };
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email envoyé à:', email);
      return result;
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      throw error;
    }
  }
}