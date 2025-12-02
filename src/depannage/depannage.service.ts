import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Depannage } from './depannage.entity';
import { MaterielService } from '../materiel/materiel.service';
import { InventaireService } from '../inventaire/inventaire.service';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';

@Injectable()
export class DepannageService {
  constructor(
    @InjectRepository(Depannage)
    private depannageRepository: Repository<Depannage>,
    private materielService: MaterielService,
    private inventaireService: InventaireService,
    private mouvementService: MouvementStockService,
  ) {}

  async generateId(): Promise<string> {
    const lastDepannage = await this.depannageRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });

    if (!lastDepannage) {
      return 'DEP01';
    }

    const lastNumber = parseInt(lastDepannage.id.replace('DEP', ''));
    const newNumber = lastNumber + 1;
    return `DEP${newNumber.toString().padStart(2, '0')}`;
  }

  /**
   * ✅ MISE À JOUR : Changer le statut du matériel uniquement si quantité disponible = 0
   */
  private async updateEtatMaterielSiBesoin(id_materiel: string, statut_depannage: string) {
    console.log(`\n=== VÉRIFICATION STATUT MATÉRIEL ===`);
    console.log(`Matériel: ${id_materiel}`);
    console.log(`Statut dépannage: ${statut_depannage}`);

    // Récupérer l'inventaire pour vérifier la quantité disponible
    const inventaire = await this.inventaireService.findByMateriel(id_materiel);
    
    if (!inventaire) {
      console.log(`⚠️ Pas d'inventaire pour ce matériel`);
      return;
    }

    console.log(`Quantité disponible: ${inventaire.quantite_disponible}`);
    console.log(`Quantité stock: ${inventaire.quantite_stock}`);

    let nouvelEtatDesignation: string | null = null;
    
    // ✅ LOGIQUE : Ne changer le statut QUE si quantité disponible = 0
    if (inventaire.quantite_disponible === 0) {
      switch (statut_depannage) {
        case 'Signalé':
        case 'En cours':
          nouvelEtatDesignation = 'en panne';
          break;
        case 'Irréparable':
          nouvelEtatDesignation = 'Hors service';
          break;
      }
      console.log(`➡️ Plus aucun disponible, changement de statut vers: ${nouvelEtatDesignation}`);
    } 
    // Si quantité disponible > 0, on remet à "disponible"
    else if (inventaire.quantite_disponible > 0 && statut_depannage === 'Résolu') {
      nouvelEtatDesignation = 'disponible';
      console.log(`➡️ Des exemplaires sont disponibles, statut: ${nouvelEtatDesignation}`);
    }
    else {
      console.log(`✅ Quantité disponible > 0, pas de changement de statut global`);
      console.log(`=====================================\n`);
      return;
    }
    
    if (!nouvelEtatDesignation) {
      console.log(`✅ Pas de changement de statut nécessaire`);
      console.log(`=====================================\n`);
      return;
    }
    
    try {
      const etatCorrespondant = await this.materielService.findEtatByDesignation(nouvelEtatDesignation);
      
      if (etatCorrespondant) {
        await this.materielService.updateEtat(id_materiel, etatCorrespondant.id);
        console.log(`✅ Statut matériel mis à jour: ${nouvelEtatDesignation}`);
      } else {
        console.log(`❌ État non trouvé pour: ${nouvelEtatDesignation}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
    }
    
    console.log(`=====================================\n`);
  }

  async create(
    id_materiel: string,
    id_demandeur: string,
    date_signalement: Date,
    description_panne: string,
    statut_depannage: string,
  ) {
    if (!id_materiel) {
      throw new BadRequestException('Le matériel est obligatoire');
    }
    if (!id_demandeur) {
      throw new BadRequestException('Le demandeur est obligatoire');
    }
    if (!description_panne) {
      throw new BadRequestException('La description de la panne est obligatoire');
    }

    const demandeurExists = await this.depannageRepository.manager
      .getRepository('Demandeur')
      .findOne({ where: { id_demandeur: id_demandeur } });
    
    if (!demandeurExists) {
      throw new BadRequestException(
        `Le demandeur avec l'ID "${id_demandeur}" n'existe pas dans la base de données.`
      );
    }

    const materielExists = await this.depannageRepository.manager
      .getRepository('Materiel')
      .findOne({ where: { id: id_materiel } });
    
    if (!materielExists) {
      throw new BadRequestException(
        `Le matériel avec l'ID "${id_materiel}" n'existe pas dans la base de données.`
      );
    }

    // ✅ VÉRIFICATION : Y a-t-il au moins un exemplaire disponible ?
    const inventaire = await this.inventaireService.findByMateriel(id_materiel);
    if (inventaire && inventaire.quantite_disponible === 0) {
      throw new BadRequestException(
        `Impossible de signaler une panne : tous les exemplaires de ce matériel sont déjà en panne (0 disponible).`
      );
    }

    const id = await this.generateId();
    
    console.log('📝 Création dépannage avec:', {
      id,
      id_materiel,
      id_demandeur,
      date_signalement,
      description_panne,
      statut_depannage
    });

    const depannage = this.depannageRepository.create({
      id,
      id_materiel,
      id_demandeur,
      date_signalement,
      description_panne,
      statut_depannage,
    });

    const savedDepannage = await this.depannageRepository.save(depannage);
    
    // ✅ CRÉER MOUVEMENT MISE EN PANNE
    await this.mouvementService.create({
      id_materiel,
      type_mouvement: MouvementType.SORTIE,
      quantite_mouvement: 1,
      id_reference: savedDepannage.id,
      type_reference: 'MISE_EN_PANNE',
      motif: `Mise en panne - ${description_panne}`,
      utilisateur: 'system',
    });

    // ✅ APPLIQUER LES CHANGEMENTS À L'INVENTAIRE
    await this.inventaireService.appliquerDepannage(id_materiel, statut_depannage);

    // ✅ METTRE À JOUR LE STATUT DU MATÉRIEL (seulement si nécessaire)
    await this.updateEtatMaterielSiBesoin(id_materiel, statut_depannage);
    
    console.log('🔔 NOTIFICATION ADMIN: Nouveau dépannage signalé', {
      id: savedDepannage.id,
      materiel: materielExists.designation,
      demandeur: `${demandeurExists.nom}`,
      statut: statut_depannage
    });
    
    return savedDepannage;
  }

  async findAll() {
    return await this.depannageRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async findOne(id: string) {
    const depannage = await this.depannageRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
    });
    
    if (!depannage) {
      throw new NotFoundException(`Dépannage ${id} non trouvé`);
    }
    
    return depannage;
  }

  async update(
    id: string,
    updateData: {
      description_panne?: string;
      statut_depannage?: string;
      date_signalement?: Date;
      id_materiel?: string;
      id_demandeur?: string;
    },
  ) {
    console.log('🚨 DÉBUT UPDATE - Statut reçu:', updateData.statut_depannage);
    
    const depannage = await this.findOne(id);
    console.log('📋 Statut actuel:', depannage.statut_depannage);
    
    const updateFields: any = {};
    
    if (updateData.description_panne !== undefined) {
      updateFields.description_panne = updateData.description_panne;
    }
    
    if (updateData.statut_depannage !== undefined) {
      updateFields.statut_depannage = updateData.statut_depannage;
    }
    
    if (updateData.date_signalement !== undefined) {
      updateFields.date_signalement = updateData.date_signalement;
    }
    
    if (updateData.id_materiel !== undefined) {
      updateFields.id_materiel = updateData.id_materiel;
    }
    
    if (updateData.id_demandeur !== undefined) {
      updateFields.id_demandeur = updateData.id_demandeur;
    }

    await this.depannageRepository.update(id, updateFields);
    const updatedDepannage = await this.findOne(id);

    // ✅ SI LE STATUT CHANGE : Mettre à jour inventaire et créer mouvement
    if (updateData.statut_depannage && updateData.statut_depannage !== depannage.statut_depannage) {
      console.log('🔄 STATUT A CHANGÉ - Mise à jour inventaire et mouvement');
      const materielId = updateData.id_materiel || depannage.id_materiel;
      
      // ✅ APPLIQUER LES CHANGEMENTS À L'INVENTAIRE
      await this.inventaireService.appliquerDepannage(
        materielId, 
        updateData.statut_depannage,
        depannage.statut_depannage
      );
      
      // Si réparé, créer mouvement RETOUR_REPARATION
      if (updateData.statut_depannage === 'Résolu') {
        await this.mouvementService.create({
          id_materiel: materielId,
          type_mouvement: MouvementType.ENTREE,
          quantite_mouvement: 1,
          id_reference: id,
          type_reference: 'RETOUR_REPARATION',
          motif: `Réparation terminée - ${depannage.description_panne}`,
          utilisateur: 'system',
        });
        console.log('✅ Message: Votre matériel est réparé et disponible !');
      }
      // Si irréparable, créer mouvement MATERIEL_IRREPARABLE
      else if (updateData.statut_depannage === 'Irréparable') {
        await this.mouvementService.create({
          id_materiel: materielId,
          type_mouvement: MouvementType.SORTIE,
          quantite_mouvement: 1,
          id_reference: id,
          type_reference: 'MATERIEL_IRREPARABLE',
          motif: `Matériel irréparable - Mise hors service - ${depannage.description_panne}`,
          utilisateur: 'system',
        });
        console.log('❌ Message: Matériel irréparable');
      }
      
      // ✅ METTRE À JOUR LE STATUT DU MATÉRIEL (seulement si nécessaire)
      await this.updateEtatMaterielSiBesoin(materielId, updateData.statut_depannage);
      
      console.log('🔔 NOTIFICATION DEMANDEUR: Statut dépannage mis à jour', {
        id: id,
        ancien_statut: depannage.statut_depannage,
        nouveau_statut: updateData.statut_depannage,
        demandeur_id: depannage.id_demandeur,
        materiel: depannage.materiel?.designation
      });
    }

    console.log('✅ FIN UPDATE');
    return updatedDepannage;
  }

  async remove(id: string) {
    const depannage = await this.findOne(id);
    
    // ✅ Si le dépannage n'était pas résolu, il faut rendre la disponibilité
    if (depannage.statut_depannage !== 'Résolu' && depannage.statut_depannage !== 'Irréparable') {

      // ✅ RÉTABLIR LA DISPONIBILITÉ DANS L'INVENTAIRE
      await this.inventaireService.appliquerDepannage(
        depannage.id_materiel, 
        'Résolu',
        depannage.statut_depannage
      );

      // ✅ METTRE À JOUR LE STATUT DU MATÉRIEL (seulement si nécessaire)
      await this.updateEtatMaterielSiBesoin(depannage.id_materiel, 'Résolu');
    }

    const result = await this.depannageRepository.delete(id);
    return result;
  }

  async findByStatut(statut: string) {
    return await this.depannageRepository.find({
      where: { statut_depannage: statut },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async findByDemandeur(id_demandeur: string) {
    return await this.depannageRepository.find({
      where: { id_demandeur },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async findByMateriel(id_materiel: string) {
    return await this.depannageRepository.find({
      where: { id_materiel },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async getStatistiques() {
    const total = await this.depannageRepository.count();
    const signale = await this.depannageRepository.count({
      where: { statut_depannage: 'Signalé' },
    });
    const enCours = await this.depannageRepository.count({
      where: { statut_depannage: 'En cours' },
    });
    const resolu = await this.depannageRepository.count({
      where: { statut_depannage: 'Résolu' },
    });
    const irreparable = await this.depannageRepository.count({
      where: { statut_depannage: 'Irréparable' },
    });

    return {
      total,
      signale,
      enCours,
      resolu,
      irreparable,
      tauxResolution: total > 0 ? ((resolu / total) * 100).toFixed(2) + '%' : '0%',
    };
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Obtenir les infos d'inventaire pour un matériel
   * Utile pour l'affichage dans l'interface
   */
  async getInventaireInfos(id_materiel: string) {
    const inventaire = await this.inventaireService.findByMateriel(id_materiel);
    
    if (!inventaire) {
      return null;
    }

    // Calculer le nombre en panne
    const enPanne = inventaire.quantite_stock - inventaire.quantite_disponible - inventaire.quantite_reservee;

    return {
      quantite_stock: inventaire.quantite_stock,
      quantite_disponible: inventaire.quantite_disponible,
      quantite_reservee: inventaire.quantite_reservee,
      quantite_en_panne: enPanne,
      est_dernier_disponible: inventaire.quantite_disponible === 1,
      tous_en_panne: inventaire.quantite_disponible === 0,
    };
  }
}
