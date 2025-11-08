import { Controller, Post, Body, Get, Query, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UtilisateurService } from '../utilisateur/utilisateur.service';
import { PasswordResetService } from '../password_reset/password.service';
import { DemandeurService } from 'src/demandeur/demandeur.service';
import { EmailService } from '../email/email.service';


@Controller('auth')
export class AuthController {
  constructor(
    private utilisateurService: UtilisateurService,
    private passwordResetService: PasswordResetService,
    private demandeurService: DemandeurService,
     private emailService: EmailService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    
    const utilisateur = await this.utilisateurService.findByEmail(email);
    if (!utilisateur) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await this.utilisateurService.validatePassword(
      password,
      utilisateur.mot_de_passe
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (utilisateur.statut !== 'actif') {
      throw new UnauthorizedException('Votre compte est désactivé');
    }

    return {
      success: true,
      utilisateur: {
        id: utilisateur.id_utilisateur,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        premier_login: utilisateur.premier_login
      }
    };
  }

  @Post('first-login-change-password')
  async firstLoginChangePassword(@Body() body: { email: string; newPassword: string }) {
    const { email, newPassword } = body;
    
    const utilisateur = await this.utilisateurService.findByEmail(email);
    if (!utilisateur) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    await this.utilisateurService.updatePassword(utilisateur.id_utilisateur, newPassword);
    
    return { success: true, message: 'Mot de passe mis à jour avec succès' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const { email } = body;
    
    const utilisateur = await this.utilisateurService.findByEmail(email);
    if (!utilisateur) {
      // Pour la sécurité, on ne révèle pas si l'email existe ou non
      return { success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé' };
    }

    const token = await this.passwordResetService.generateToken(email);
    
    // Ici, normalement on enverrait l'email
    // Pour le moment, on retourne le token dans la réponse (à supprimer en production)
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    
    console.log(`Lien de réinitialisation pour ${email}: ${resetLink}`);
    
    return { 
      success: true, 
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      // À supprimer en production :
      resetLink 
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    const { token, newPassword } = body;

    const validation = await this.passwordResetService.validateToken(token);
    if (!validation.valid) {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    // Correction de l'erreur TypeScript ici
    const utilisateurEmail = validation.email;
    if (!utilisateurEmail) {
      throw new BadRequestException('Email non trouvé');
    }

    const utilisateur = await this.utilisateurService.findByEmail(utilisateurEmail);
    if (!utilisateur) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    await this.utilisateurService.updatePassword(utilisateur.id_utilisateur, newPassword);
    await this.passwordResetService.markTokenAsUsed(token);

    return { success: true, message: 'Mot de passe réinitialisé avec succès' };
  }

  @Get('validate-token')
  async validateToken(@Query('token') token: string) {
    const validation = await this.passwordResetService.validateToken(token);
    
    if (!validation.valid) {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    return { valid: true, email: validation.email };
  }

  // NOUVEAUX ENDPOINTS POUR LA GESTION DES DEMANDEURS
  @Get('pending-demandeurs')
  async getPendingDemandeurs() {
    const demandeurs = await this.utilisateurService.findPendingDemandeurs();
    return { success: true, data: demandeurs };
  }

  @Post('activate-demandeur')
async activateDemandeur(@Body() body: { idUtilisateur: number; password: string }) {
  const utilisateur = await this.utilisateurService.activateDemandeur(
    body.idUtilisateur, 
    body.password
  );
  
  // CORRECTION : Vérifier si utilisateur existe
  if (!utilisateur) {
    throw new BadRequestException('Utilisateur non trouvé après activation');
  }
  
  // ENVOYER L'EMAIL
  try {
    await this.emailService.sendActivationEmail(
      utilisateur.email, // Maintenant utilisateur n'est plus null
      utilisateur.nom,
      body.password
    );
    console.log('✅ Email d\'activation envoyé à:', utilisateur.email);
  } catch (emailError) {
    console.error('❌ Erreur envoi email, mais compte activé:', emailError);
  }
  
  return { 
    success: true, 
    message: 'Demandeur activé avec succès - Email envoyé',
    utilisateur 
  };
}

  @Post('reject-demandeur')
  async rejectDemandeur(@Body() body: { idUtilisateur: number }) {
    await this.utilisateurService.rejectDemandeur(body.idUtilisateur);
    return { success: true, message: 'Demandeur refusé' };
  }

  @Get('debug-admin')
  async debugAdmin() {
    const admin = await this.utilisateurService.findByEmail('admin@organisation.mg');
    if (!admin) {
      return { error: 'Admin non trouvé' };
    }
    
    return {
      email: admin.email,
      mot_de_passe_hash: admin.mot_de_passe,
      role: admin.role,
      statut: admin.statut
    };
  }

  @Get('fix-admin')
  async fixAdmin() {
    await this.utilisateurService.recreateAdmin();
    return { message: 'Admin recréé avec bcrypt' };
  }

  @Get('check-admin')
  async checkAdmin() {
    const admin = await this.utilisateurService.findByEmail('admin@organisation.mg');
    if (!admin) {
      return { error: 'Admin non trouvé' };
    }
    
    // Tester le mot de passe
    const testPassword = 'Admin12345!';
    const isValid = await this.utilisateurService.validatePassword(testPassword, admin.mot_de_passe);
    
    return {
      email: admin.email,
      hash: admin.mot_de_passe,
      isBcrypt: admin.mot_de_passe.startsWith('$2b$'),
      passwordValid: isValid,
      testPassword: testPassword
    };
  }

  @Get('fix-admin-password')
  async fixAdminPassword() {
    await this.utilisateurService.fixAdminPassword();
    return { message: 'Hash admin corrigé' };
  }

  @Get('verify-admin')
  async verifyAdmin() {
    const admin = await this.utilisateurService.findByEmail('admin@organisation.mg');
    if (!admin) {
      return { error: 'Admin non trouvé' };
    }
    
    const isValid = await this.utilisateurService.validatePassword('Admin12345!', admin.mot_de_passe);
    
    return {
      email: admin.email,
      hash: admin.mot_de_passe,
      passwordValid: isValid,
      message: isValid ? '✅ Connexion fonctionne' : '❌ Problème de hash'
    };
  }

  @Post('register-demandeur')
  async registerDemandeur(
    @Body() body: {
      nom: string;
      email: string;
      telephone: string;
      typeDemandeur: string;
      id_departement?: string;
    }
  ) {
    try {
      // 1. Vérifier si l'email existe déjà
      const existingUser = await this.utilisateurService.findByEmail(body.email);
      if (existingUser) {
        return {
          success: false,
          message: 'Cet email est déjà utilisé'
        };
      }

      // 2. Créer l'utilisateur avec statut "en_attente"
      const utilisateur = await this.utilisateurService.create({
        nom: body.nom,
        email: body.email,
        role: 'demandeur',
        statut: 'en_attente',
        premier_login: true,
        // mot_de_passe sera NULL pour l'instant
      });

      // 3. Créer le demandeur
      const demandeur = await this.demandeurService.create(
        body.nom,
        body.telephone,
        body.email,
        body.typeDemandeur,
        body.id_departement || '', // NULL si enseignant
        utilisateur.id_utilisateur
      );

      return {
        success: true,
        message: 'Demande d\'inscription envoyée avec succès',
        data: {
          utilisateur,
          demandeur
        }
      };

    } catch (error) {
      console.error('Erreur création demandeur:', error);
      return {
        success: false,
        message: 'Erreur lors de la création du compte'
      };
    }
  }
}