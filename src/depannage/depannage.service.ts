import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Depannage } from './depannage.entity';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { InventaireService } from '../inventaire/inventaire.service';
import { MaterielService } from '../materiel/materiel.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';

@Injectable()
export class DepannageService {
  constructor(
    @InjectRepository(Depannage)
    private depannageRepository: Repository<Depannage>,
    @Inject(forwardRef(() => MouvementStockService))
    private mouvementService: MouvementStockService,
    @Inject(forwardRef(() => InventaireService))
    private inventaireService: InventaireService,
    @Inject(forwardRef(() => MaterielService))
    private materielService: MaterielService,
  ) {}

  async generateId(): Promise<string> {
    const lastDepannage = await this.depannageRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });

    if (!lastDepannage) {
      return 'DEP001';
    }

    const lastNumber = parseInt(lastDepannage.id.replace('DEP', ''));
    const newNumber = lastNumber + 1;
    return `DEP${newNumber.toString().padStart(3, '0')}`;
  }

  async create(
    id_materiel: string,
    id_demandeur: string,
    date_signalement: Date,
    description_panne: string,
    statut_depannage: string,
  ) {
    const id = await this.generateId();

    console.log('📝 Création dépannage avec:', {
      id,
      id_materiel,
      id_demandeur,
      date_signalement,
      description_panne,
      statut_depannage,
    });

    const depannage = this.depannageRepository.create({
      id,
      materiel: { id: id_materiel } as any,
      demandeur: { id_demandeur: id_demandeur } as any,
      date_signalement,
      description_panne,
      statut_depannage,
    });

    const saved = await this.depannageRepository.save(depannage);

    //  = Sortie temporaire (panne)
    await this.mouvementService.create({
      id_materiel,
      type_mouvement: MouvementType.RESERVATION,
      quantite_mouvement: 1,
      id_reference: id,
      type_reference: 'MISE_EN_PANNE',
      motif: `Mise en panne - ${description_panne}`,
      utilisateur: 'system',
    });

    // ✅ Mettre à jour l'inventaire
    await this.inventaireService.appliquerDepannage(
      id_materiel,
      'Signalé',

    );

    await this.verifierStatutMateriel(id_materiel);

    console.log('🔔 NOTIFICATION ADMIN: Nouveau dépannage signalé', {
      id,
      materiel: saved.materiel?.designation,
      demandeur: saved.demandeur?.nom,
      statut: 'Signalé',
    });

    return saved;
  }

  async update(id: string, updateDepannageDto: any) {
    const depannage = await this.findOne(id);
    const ancien_statut = depannage.statut_depannage;
    const nouveau_statut = updateDepannageDto.statut_depannage;

    await this.depannageRepository.update(id, updateDepannageDto);

    if (ancien_statut !== nouveau_statut) {
      // ✅ Cas 1 : Passage en cours (pas de nouveau mouvement)
      if (nouveau_statut === 'En cours') {
        console.log('🔄 Passage en cours de réparation');
      }
      
      // ✅ Cas 2 : Résolution → DERESERVATION (retour sortie temporaire)
      else if (nouveau_statut === 'Résolu' && ancien_statut !== 'Résolu') {
        await this.mouvementService.create({
          id_materiel: depannage.materiel.id,
          type_mouvement: MouvementType.DERESERVATION,
          quantite_mouvement: 1,
          id_reference: id,
          type_reference: 'RETOUR_REPARATION',
          motif: `Réparation terminée - ${depannage.description_panne}`,
          utilisateur: 'system',
        });
      }
      
      // ✅ Cas 3 : Irréparable → SORTIE définitive
      else if (nouveau_statut === 'Irréparable' && ancien_statut !== 'Irréparable') {
        const cump = await this.inventaireService.getCUMP(depannage.materiel.id);
        
        await this.mouvementService.create({
          id_materiel: depannage.materiel.id,
          type_mouvement: MouvementType.SORTIE,
          quantite_mouvement: 1,
          prix_unitaire: cump,
          id_reference: id,
          type_reference: 'MATERIEL_IRREPARABLE',
          motif: `Matériel irréparable - ${depannage.description_panne}`,
          utilisateur: 'system',
        });
      }

      // ✅ Mettre à jour l'inventaire
      await this.inventaireService.appliquerDepannage(
        depannage.materiel.id,
        nouveau_statut,
        ancien_statut,
      );

      await this.verifierStatutMateriel(depannage.materiel.id);
    }

    return this.findOne(id);
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

  async findByMateriel(id_materiel: string) {
    return await this.depannageRepository.find({
      where: { materiel: { id: id_materiel } },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  // ✅ MÉTHODE MANQUANTE : findByStatut
  async findByStatut(statut: string) {
    return await this.depannageRepository.find({
      where: { statut_depannage: statut },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  // ✅ MÉTHODE MANQUANTE : findByDemandeur
  async findByDemandeur(id_demandeur: string) {
    return await this.depannageRepository.find({
      where: { demandeur: { id_demandeur: id_demandeur } },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  // ✅ MÉTHODE MANQUANTE : getInventaireInfos
  async getInventaireInfos(id_materiel: string) {
    const inventaire = await this.inventaireService.findByMateriel(id_materiel);
    
    if (!inventaire) {
      return {
        existe: false,
        message: 'Aucun inventaire pour ce matériel',
      };
    }

    // Compter les dépannages par statut
    const depannages = await this.findByMateriel(id_materiel);
    
    const statistiques = {
      signales: depannages.filter(d => d.statut_depannage === 'Signalé').length,
      enCours: depannages.filter(d => d.statut_depannage === 'En cours').length,
      resolus: depannages.filter(d => d.statut_depannage === 'Résolu').length,
      irreparables: depannages.filter(d => d.statut_depannage === 'Irréparable').length,
    };

    return {
      existe: true,
      inventaire: {
        id: inventaire.id,
        quantite_stock: inventaire.quantite_stock,
        quantite_disponible: inventaire.quantite_disponible,
        quantite_indisponible: inventaire.quantite_reservee,
        seuil_alerte: inventaire.seuil_alerte,
        valeur_stock: inventaire.valeur_stock,
      },
      materiel: {
        id: inventaire.materiel.id,
        designation: inventaire.materiel.designation,
   
      },
      depannages: statistiques,
      total_depannages: depannages.length,
      depannages_actifs: statistiques.signales + statistiques.enCours,
    };
  }

  // ✅ MÉTHODE MANQUANTE : remove
  async remove(id: string) {
    const depannage = await this.findOne(id);

    // ✅ Vérifier que le dépannage n'est pas en cours
    if (depannage.statut_depannage === 'En cours') {
      throw new BadRequestException(
        'Impossible de supprimer un dépannage en cours de traitement'
      );
    }

    // ✅ Si le dépannage était signalé mais pas encore résolu, annuler la réservation
    if (depannage.statut_depannage === 'Signalé') {
      // Créer un mouvement DERESERVATION pour annuler
      await this.mouvementService.create({
        id_materiel: depannage.materiel.id,
        type_mouvement: MouvementType.DERESERVATION,
        quantite_mouvement: 1,
        id_reference: id,
        type_reference: 'ANNULATION_DEPANNAGE',
        motif: `Annulation dépannage ${id}`,
        utilisateur: 'system',
      });

      // Remettre à jour l'inventaire
      await this.inventaireService.appliquerDepannage(
        depannage.materiel.id,
        'Résolu', // On simule une résolution pour libérer
        'Signalé',
      );
    }

    await this.depannageRepository.remove(depannage);
    console.log(`✅ Dépannage ${id} supprimé`);

    return { message: 'Dépannage supprimé avec succès' };
  }

  async getStatistiques() {
    const total = await this.depannageRepository.count();
    
    const signales = await this.depannageRepository.count({
      where: { statut_depannage: 'Signalé' }
    });
    
    const enCours = await this.depannageRepository.count({
      where: { statut_depannage: 'En cours' }
    });
    
    const resolus = await this.depannageRepository.count({
      where: { statut_depannage: 'Résolu' }
    });
    
    const irreparables = await this.depannageRepository.count({
      where: { statut_depannage: 'Irréparable' }
    });

    // Matériels les plus en panne
    const materielsEnPanne = await this.depannageRepository
      .createQueryBuilder('depannage')
      .leftJoinAndSelect('depannage.materiel', 'materiel')
      .select('materiel.designation', 'designation')
      .addSelect('COUNT(*)', 'nombre_pannes')
      .addSelect('SUM(CASE WHEN depannage.statut_depannage = \'Irréparable\' THEN 1 ELSE 0 END)', 'irreparables')
      .groupBy('materiel.id')
      .addGroupBy('materiel.designation')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      total,
      signales,
      enCours,
      resolus,
      irreparables,
      enAttente: signales + enCours,
      tauxResolution: total > 0 ? ((resolus / total) * 100).toFixed(2) : 0,
      materielsEnPanne,
    };
  }

  private async verifierStatutMateriel(id_materiel: string) {
    console.log('\n=== VÉRIFICATION STATUT MATÉRIEL ===');
    
    const inventaire = await this.inventaireService.findByMateriel(id_materiel);
    
    if (!inventaire) {
      console.log('⚠️ Pas d\'inventaire pour ce matériel');
      return;
    }

    console.log(`Matériel: ${id_materiel}`);
    console.log(`Quantité disponible: ${inventaire.quantite_disponible}`);
    console.log(`Quantité stock: ${inventaire.quantite_stock}`);
    console.log(`Quantité indisponible: ${inventaire.quantite_reservee}`);

    if (inventaire.quantite_disponible > 0) {
      console.log('✅ Quantité disponible > 0, pas de changement de statut global');
    } else {
      console.log('⚠️ Quantité disponible = 0, tous les exemplaires sont indisponibles');
    }
    
    console.log('=====================================\n');
  }
}
