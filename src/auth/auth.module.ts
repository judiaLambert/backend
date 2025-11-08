import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { UtilisateurService } from '../utilisateur/utilisateur.service';
import { PasswordResetService } from '../password_reset/password.service';
import { Utilisateur } from '../utilisateur/utilisateur.entity';
import { PasswordResetToken } from '../password_reset/password.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { DemandeurService } from '../demandeur/demandeur.service';
import { EmailService } from '../email/email.service'; 

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, PasswordResetToken, Demandeur])],
  controllers: [AuthController],
  providers: [UtilisateurService, PasswordResetService, DemandeurService, EmailService],
})
export class AuthModule implements OnModuleInit {
  constructor(private utilisateurService: UtilisateurService) {}

  async onModuleInit() {
    // Créer le compte admin au démarrage de l'application
    await this.utilisateurService.createAdmin();
  }
}