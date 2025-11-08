import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './utilisateur.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilisateurService {
  constructor(
    @InjectRepository(Utilisateur)
    private utilisateurRepo: Repository<Utilisateur>,
    
    // Ajouter le repository Demandeur
    @InjectRepository(Demandeur)
    private demandeurRepo: Repository<Demandeur>,
  ) {}

  async findByEmail(email: string): Promise<Utilisateur | null> {
    return this.utilisateurRepo.findOne({ where: { email } });
  }

  // Méthode de hash avec bcrypt
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async create(utilisateurData: Partial<Utilisateur>): Promise<Utilisateur> {
    if (utilisateurData.mot_de_passe) {
      utilisateurData.mot_de_passe = await this.hashPassword(utilisateurData.mot_de_passe);
    }
    const utilisateur = this.utilisateurRepo.create(utilisateurData);
    return this.utilisateurRepo.save(utilisateur);
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await this.utilisateurRepo.update(id, { 
      mot_de_passe: hashedPassword,
      premier_login: false 
    });
  }

  // NOUVELLE METHODE : Trouver les demandeurs en attente
  // utilisateur.service.ts
async findPendingDemandeurs() {
  try {
    console.log('🔄 Recherche des demandeurs en attente...');

    // Méthode CORRECTE : Partir de Demandeur et joindre Utilisateur
    const result = await this.demandeurRepo
      .createQueryBuilder('demandeur')
      .leftJoinAndSelect('demandeur.utilisateur', 'utilisateur')
      .leftJoinAndSelect('demandeur.departement', 'departement')
      .where('utilisateur.role = :role', { role: 'demandeur' })
      .andWhere('utilisateur.statut = :statut', { statut: 'en_attente' })
      .getMany();

    console.log('✅ Résultat Demandeur QueryBuilder:', result);
    return result;

  } catch (error) {
    console.error('❌ Erreur findPendingDemandeurs:', error);
    
    // Fallback : Récupérer juste les utilisateurs sans relations
    const fallback = await this.utilisateurRepo.find({
      where: { 
        role: 'demandeur',
        statut: 'en_attente' 
      }
    });
    console.log('✅ Fallback (utilisateurs seulement):', fallback);
    return fallback;
  }
}

  // NOUVELLE METHODE : Activer un demandeur
 
async activateDemandeur(idUtilisateur: number, password: string) {
  try {
    console.log('🔄 Activation demandeur ID:', idUtilisateur);
    
    // VÉRIFICATION CRITIQUE
    if (!idUtilisateur || idUtilisateur <= 0) {
      throw new Error('ID utilisateur invalide: ' + idUtilisateur);
    }

    const hashedPassword = await this.hashPassword(password);
    
    console.log('🔑 Mise à jour utilisateur ID:', idUtilisateur);
    
    // CORRECTION : Utiliser { id_utilisateur: idUtilisateur } comme critère
    const updateResult = await this.utilisateurRepo.update(
      { id_utilisateur: idUtilisateur }, // CRITÈRE DE RECHERCHE
      {
        mot_de_passe: hashedPassword,
        statut: 'actif',
        premier_login: true
      }
    );

    console.log('✅ Résultat mise à jour:', updateResult);

    if (updateResult.affected === 0) {
      throw new Error('Aucun utilisateur trouvé avec cet ID');
    }
    
    return this.utilisateurRepo.findOne({
      where: { id_utilisateur: idUtilisateur }
    });

  } catch (error) {
    console.error('❌ Erreur activation demandeur:', error);
    throw error;
  }
}

  // NOUVELLE METHODE : Refuser un demandeur

async rejectDemandeur(idUtilisateur: number) {
  try {
    console.log('🗑️ Suppression demandeur ID:', idUtilisateur);
    
    if (!idUtilisateur || idUtilisateur <= 0) {
      throw new Error('ID utilisateur invalide: ' + idUtilisateur);
    }

    // CORRECTION : Rechercher avec le bon critère
    const demandeur = await this.demandeurRepo.findOne({
      where: { utilisateur: { id_utilisateur: idUtilisateur } }
    });
    
    console.log('🔍 Demandeur trouvé:', demandeur);
    
    if (demandeur) {
      await this.demandeurRepo.delete(demandeur.id_demandeur);
      console.log('✅ Demandeur supprimé');
    }
    
    // CORRECTION : Utiliser { id_utilisateur: idUtilisateur }
    const deleteResult = await this.utilisateurRepo.delete({ id_utilisateur: idUtilisateur });
    console.log('✅ Utilisateur supprimé:', deleteResult);
    
    return deleteResult;

  } catch (error) {
    console.error('❌ Erreur suppression demandeur:', error);
    throw error;
  }
}

//creation d el'admin
  async createAdmin(): Promise<void> {
    const adminExists = await this.findByEmail('admin@organisation.mg');
    
    if (adminExists) {
      console.log('✅ Admin existe déjà');
      console.log('🔑 Hash en base:', adminExists.mot_de_passe);
      
      // Tester le mot de passe actuel
      const isValid = await this.validatePassword('Admin12345!', adminExists.mot_de_passe);
      console.log('✅ Mot de passe valide?', isValid);
      return;
    }

    console.log('🔄 Création du compte admin...');
    const hashedPassword = await this.hashPassword('Admin12345!');
    console.log('🔑 Hash généré:', hashedPassword);

    try {
      const admin = this.utilisateurRepo.create({
        nom: 'Admin',
        email: 'admin@organisation.mg',
        mot_de_passe: hashedPassword,
        role: 'admin',
        statut: 'actif',
        premier_login: false
      });
      
      const savedAdmin = await this.utilisateurRepo.save(admin);
      console.log('✅ Admin sauvegardé avec ID:', savedAdmin.id_utilisateur);
      
      // Vérifier ce qui a été réellement sauvegardé
      const verifiedAdmin = await this.findByEmail('admin@organisation.mg');
      if (verifiedAdmin) {
        console.log('🔍 Hash après sauvegarde:', verifiedAdmin.mot_de_passe);
      } else {
        console.log('❌ Admin non trouvé après sauvegarde');
      }
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde admin:', error);
    }
  }

  async fixAdminPassword(): Promise<void> {
    const admin = await this.findByEmail('admin@organisation.mg');
    if (!admin) {
      console.log('❌ Admin non trouvé');
      return;
    }

    console.log('🔄 Correction du hash admin...');
    console.log('🔑 Ancien hash:', admin.mot_de_passe);
    
    const newHash = await this.hashPassword('Admin12345!');
    console.log('🔑 Nouveau hash:', newHash);
    
    await this.utilisateurRepo.update(admin.id_utilisateur, {
      mot_de_passe: newHash
    });
    
    console.log('✅ Hash mis à jour');
    
    // Vérifier
    const updatedAdmin = await this.findByEmail('admin@organisation.mg');
    if (updatedAdmin) {
      console.log('🔍 Hash après mise à jour:', updatedAdmin.mot_de_passe);
    } else {
      console.log('❌ Impossible de vérifier la mise à jour');
    }
  }

  async recreateAdmin(): Promise<void> {
    // Supprimer l'admin existant
    await this.utilisateurRepo.delete({ email: 'admin@organisation.mg' });
    
    // Recréer avec bcrypt
    const hashedPassword = await this.hashPassword('Admin12345!');
    
    const admin = this.utilisateurRepo.create({
      nom: 'Admin',
      email: 'admin@organisation.mg',
      mot_de_passe: hashedPassword,
      role: 'admin',
      statut: 'actif',
      premier_login: false
    });
    
    await this.utilisateurRepo.save(admin);
    console.log('✅ Admin recréé avec bcrypt');
    console.log('🔑 Nouveau hash bcrypt:', hashedPassword);
  }
}