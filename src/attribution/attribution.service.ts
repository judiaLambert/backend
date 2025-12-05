import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribution } from './attribution.entity';
import { Materiel } from '../materiel/materiel.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { InventaireService } from '../inventaire/inventaire.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';
import { DemandeMateriel } from '../demande_materiel/demande.entity'; 
import { DetailDemande } from '../detail_demande/detail.entity'; 

@Injectable()
export class AttributionService {
  constructor(
    @InjectRepository(Attribution)
    private attributionRepository: Repository<Attribution>,
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    @InjectRepository(Demandeur)
    private demandeurRepository: Repository<Demandeur>,
    @Inject(forwardRef(() => MouvementStockService))
    private mouvementService: MouvementStockService,
    @Inject(forwardRef(() => InventaireService))
    private inventaireService: InventaireService,
    @InjectRepository(DemandeMateriel)  
    private demandeRepository: Repository<DemandeMateriel>,
    @InjectRepository(DetailDemande)
    private detailDemandeRepository: Repository<DetailDemande>,
  ) {}

  async generateId(): Promise<string> {
    const lastAttribution = await this.attributionRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });

    if (!lastAttribution) {
      return 'ATT001';
    }

    const lastNumber = parseInt(lastAttribution.id.replace('ATT', ''));
    const newNumber = lastNumber + 1;
    return `ATT${newNumber.toString().padStart(3, '0')}`;
  }

 async create(createAttributionDto: {
  id_materiel: string;
  id_demandeur: string;
  quantite_attribuee: number;
  date_attribution?: Date;
  date_retour_prevue?: Date;
  motif_attribution?: string;
  type_possession?: 'temporaire' | 'definitive';
}) {
  console.log(`\n📦 === CRÉATION ATTRIBUTION ===`);
  console.log('DTO complet reçu:', JSON.stringify(createAttributionDto, null, 2));

  // ✅ VÉRIFICATION IMMÉDIATE
  if (!createAttributionDto.id_demandeur) {
    console.error('❌ ERREUR : id_demandeur est manquant !');
    throw new BadRequestException('id_demandeur est obligatoire');
  }

  if (!createAttributionDto.id_materiel) {
    throw new BadRequestException('id_materiel est obligatoire');
  }

  console.log(`✅ id_demandeur reçu: ${createAttributionDto.id_demandeur}`);
  console.log(`✅ id_materiel reçu: ${createAttributionDto.id_materiel}`);

  const id = await this.generateId();

  // ✅ Vérifier que le matériel existe
  const materiel = await this.materielRepository.findOne({
    where: { id: createAttributionDto.id_materiel },
    relations: ['typeMateriel'],
  });

  if (!materiel) {
    throw new NotFoundException(`Matériel ${createAttributionDto.id_materiel} non trouvé`);
  }

  console.log(`✅ Matériel trouvé: ${materiel.designation}`);

  // ✅ Vérifier que le demandeur existe
  const demandeur = await this.demandeurRepository.findOne({
    where: { id_demandeur: createAttributionDto.id_demandeur },
  });

  if (!demandeur) {
    throw new NotFoundException(`Demandeur ${createAttributionDto.id_demandeur} non trouvé`);
  }

  console.log(`✅ Demandeur trouvé: ${demandeur.nom} (ID: ${demandeur.id_demandeur})`);

  // ✅ RÉCUPÉRER LE TYPE_POSSESSION DEPUIS LA DEMANDE APPROUVÉE
  let typePossession = createAttributionDto.type_possession || 'temporaire';
  
  // Chercher la demande approuvée contenant ce matériel pour ce demandeur
  const demandes = await this.demandeRepository.find({
    where: {
      demandeur: { id_demandeur: createAttributionDto.id_demandeur },
      statut: 'Approuvée',
    },
    relations: ['detailDemandes', 'detailDemandes.materiel'],
  });

  // Trouver la demande qui contient ce matériel
  for (const demande of demandes) {
    const detailCorrespondant = demande.detailDemandes?.find(
      d => d.materiel.id === createAttributionDto.id_materiel
    );
    
    if (detailCorrespondant) {
      typePossession = demande.type_possession as 'temporaire' | 'definitive';
      console.log(`✅ Type de possession trouvé depuis la demande: ${typePossession}`);
      break;
    }
  }

  // ✅ Vérifier la disponibilité du stock
  const inventaire = await this.inventaireService.findByMateriel(createAttributionDto.id_materiel);

  if (!inventaire) {
    throw new BadRequestException(`Pas d'inventaire pour le matériel ${createAttributionDto.id_materiel}`);
  }

  if (inventaire.quantite_disponible < createAttributionDto.quantite_attribuee) {
    throw new BadRequestException(
      `Stock insuffisant. Disponible: ${inventaire.quantite_disponible}, Demandé: ${createAttributionDto.quantite_attribuee}`
    );
  }

  console.log(`✅ Stock vérifié: ${inventaire.quantite_disponible} disponible(s)`);

  // ✅ Vérifier la cohérence type_possession / date_retour_prevue
  if (typePossession === 'definitive' && createAttributionDto.date_retour_prevue) {
    console.log('⚠️ Attribution définitive avec date de retour → Ignorée');
    createAttributionDto.date_retour_prevue = undefined;
  }

  if (typePossession === 'temporaire' && !createAttributionDto.date_retour_prevue) {
    throw new BadRequestException('Une attribution temporaire doit avoir une date de retour prévue');
  }

  // ✅ Créer l'attribution
  const attribution = this.attributionRepository.create({
    id,
    materiel: materiel,
    demandeur: demandeur,
    quantite_attribuee: createAttributionDto.quantite_attribuee,
    date_attribution: createAttributionDto.date_attribution || new Date(),
    date_retour_prevue: createAttributionDto.date_retour_prevue,
    motif_attribution: createAttributionDto.motif_attribution,
    statut_attribution: 'En possession',
  });

  console.log('📋 Attribution à sauvegarder:', {
    id: attribution.id,
    id_materiel: createAttributionDto.id_materiel,
    id_demandeur: createAttributionDto.id_demandeur,
    quantite: attribution.quantite_attribuee,
    statut: attribution.statut_attribution,
    date_retour_prevue: attribution.date_retour_prevue,
    type_possession: typePossession,
  });

  const saved = await this.attributionRepository.save(attribution);

  console.log(`✅ Attribution ${saved.id} sauvegardée en base`);

  // ✅ CORRECTION : Créer le mouvement selon le type (qui mettra à jour l'inventaire)
  if (typePossession === 'definitive') {
    // ✅ Possession définitive = SORTIE réelle du stock
    const cump = await this.inventaireService.getCUMP(createAttributionDto.id_materiel);

    console.log(`\n💸 === ATTRIBUTION DÉFINITIVE (SORTIE) ===`);
    console.log(`Matériel: ${materiel.designation}`);
    console.log(`Quantité: ${createAttributionDto.quantite_attribuee}`);
    console.log(`CUMP: ${cump.toFixed(2)} Ar`);
    console.log(`Valeur sortie: ${(cump * createAttributionDto.quantite_attribuee).toFixed(2)} Ar`);
    console.log(`Demandeur: ${demandeur.nom}`);
    console.log(`==========================================\n`);

    // ✅ Créer le mouvement SORTIE
    // Le MouvementStockService mettra automatiquement à jour l'inventaire
    await this.mouvementService.create({
      id_materiel: createAttributionDto.id_materiel,
      type_mouvement: MouvementType.SORTIE,
      quantite_mouvement: createAttributionDto.quantite_attribuee,
      prix_unitaire: cump,
      id_reference: id,
      type_reference: 'ATTRIBUTION_DEFINITIVE',
      motif: createAttributionDto.motif_attribution || 
        `Attribution définitive à ${demandeur.nom}`,
      utilisateur: 'system',
    });

    // ❌ SUPPRIMÉ : Ne pas appeler appliquerSortieDefinitive() ici
    // Car mouvementService.create() l'a déjà fait automatiquement !
    
  } else {
    // ✅ Possession temporaire = RESERVATION
    console.log(`\n📦 === ATTRIBUTION TEMPORAIRE (RÉSERVATION) ===`);
    console.log(`Matériel: ${materiel.designation}`);
    console.log(`Quantité: ${createAttributionDto.quantite_attribuee}`);
    console.log(`Date retour prévue: ${createAttributionDto.date_retour_prevue}`);
    console.log(`Demandeur: ${demandeur.nom}`);
    console.log(`===============================================\n`);

    // ✅ Créer le mouvement RESERVATION
    await this.mouvementService.create({
      id_materiel: createAttributionDto.id_materiel,
      type_mouvement: MouvementType.RESERVATION,
      quantite_mouvement: createAttributionDto.quantite_attribuee,
      id_reference: id,
      type_reference: 'ATTRIBUTION_TEMPORAIRE',
      motif: createAttributionDto.motif_attribution || 
        `Attribution temporaire à ${demandeur.nom}`,
      utilisateur: 'system',
    });

    // ✅ Pour les réservations, appeler appliquerAttribution()
    // Car RESERVATION ne met pas automatiquement à jour l'inventaire
    await this.inventaireService.appliquerAttribution(
      createAttributionDto.id_materiel,
      createAttributionDto.quantite_attribuee,
    );
  }

  console.log(`✅ Attribution ${id} créée : ${createAttributionDto.quantite_attribuee} unité(s) de ${materiel.designation} (${typePossession})`);

  return this.findOne(id);
}



  async retourner(id: string, retourData: {
    date_retour_effective?: Date;
    commentaire_retour?: string;
  }) {
    const attribution = await this.findOne(id);

    if (attribution.statut_attribution !== 'En possession') {
      throw new BadRequestException('Seules les attributions en possession peuvent être retournées');
    }

    // Vérifier si c'était une possession temporaire (RESERVATION)
    const mouvements = await this.mouvementService.findByReference('ATTRIBUTION_TEMPORAIRE', id);
    
    if (mouvements.length === 0) {
      // Vérifier si c'était une attribution définitive
      const mouvementsDefinitifs = await this.mouvementService.findByReference('ATTRIBUTION_DEFINITIVE', id);
      
      if (mouvementsDefinitifs.length > 0) {
        throw new BadRequestException('Impossible de retourner une attribution définitive');
      }
    }

    // Mettre à jour le statut
    await this.attributionRepository.update(id, {
      statut_attribution: 'Retourné',
    });

    // ✅ DERESERVATION = Retour de sortie temporaire
    await this.mouvementService.create({
      id_materiel: attribution.materiel.id,
      type_mouvement: MouvementType.DERESERVATION,
      quantite_mouvement: attribution.quantite_attribuee,
      id_reference: id,
      type_reference: 'RETOUR_ATTRIBUTION',
      motif: retourData.commentaire_retour || `Retour attribution ${id}`,
      utilisateur: 'system',
    });

    // ✅ Mettre à jour l'inventaire
    await this.inventaireService.appliquerRetour(
      attribution.materiel.id,
      attribution.quantite_attribuee,
    );

    console.log(`✅ Attribution ${id} retournée : ${attribution.quantite_attribuee} unité(s)`);

    return this.findOne(id);
  }

  async findAll() {
    return await this.attributionRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_attribution: 'DESC' },
    });
  }

  async findOne(id: string) {
    const attribution = await this.attributionRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
    });

    if (!attribution) {
      throw new NotFoundException(`Attribution ${id} non trouvée`);
    }

    return attribution;
  }

  async findByMateriel(id_materiel: string) {
    return await this.attributionRepository.find({
      where: { materiel: { id: id_materiel } },
      relations: ['materiel', 'demandeur'],
      order: { date_attribution: 'DESC' },
    });
  }

  async findByDemandeur(id_demandeur: string) {
    return await this.attributionRepository.find({
      where: { demandeur: { id_demandeur: id_demandeur } },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_attribution: 'DESC' },
    });
  }

  async getEnCours(id_demandeur?: string) {
    const where: any = { statut_attribution: 'En possession' };
    
    if (id_demandeur) {
      where.demandeur = { id: id_demandeur };
    }

    return await this.attributionRepository.find({
      where,
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_attribution: 'DESC' },
    });
  }

  async remove(id: string) {
    const attribution = await this.findOne(id);

    if (attribution.statut_attribution === 'En possession') {
      throw new BadRequestException(
        'Impossible de supprimer une attribution en cours. Effectuez d\'abord le retour.'
      );
    }

    await this.attributionRepository.remove(attribution);
    console.log(`✅ Attribution ${id} supprimée`);
    
    return { message: 'Attribution supprimée avec succès' };
  }

  async getStatistiques() {
    const total = await this.attributionRepository.count();
    
    const enCours = await this.attributionRepository.count({
      where: { statut_attribution: 'En possession' }
    });
    
    const retournees = await this.attributionRepository.count({
      where: { statut_attribution: 'Retourné' }
    });

    // Statistiques par demandeur
    const parDemandeur = await this.attributionRepository
      .createQueryBuilder('attribution')
      .leftJoinAndSelect('attribution.demandeur', 'demandeur')
      .select('demandeur.nom', 'nom')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN attribution.statut_attribution = \'En possession\' THEN 1 ELSE 0 END)', 'en_cours')
      .groupBy('demandeur.id_demandeur')
      .addGroupBy('demandeur.nom')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    // Matériels les plus attribués
    const materielsPopulaires = await this.attributionRepository
      .createQueryBuilder('attribution')
      .leftJoinAndSelect('attribution.materiel', 'materiel')
      .select('materiel.designation', 'designation')
      .addSelect('SUM(attribution.quantite_attribuee)', 'total_attribue')
      .addSelect('COUNT(*)', 'nombre_attributions')
      .groupBy('materiel.id')
      .addGroupBy('materiel.designation')
      .orderBy('SUM(attribution.quantite_attribuee)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      total,
      enCours,
      retournees,
      parDemandeur,
      materielsPopulaires,
    };
  }

  async getAttributionsEnRetard() {
    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);

    const attributionsEnRetard = await this.attributionRepository
      .createQueryBuilder('attribution')
      .leftJoinAndSelect('attribution.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .leftJoinAndSelect('attribution.demandeur', 'demandeur')
      .where('attribution.statut_attribution = :statut', { statut: 'En possession' })
      .andWhere('attribution.date_retour_prevue < :aujourd_hui', { aujourd_hui })
      .orderBy('attribution.date_retour_prevue', 'ASC')
      .getMany();

    console.log(`⚠️ ${attributionsEnRetard.length} attribution(s) en retard`);

    return attributionsEnRetard;
  }

  async changerStatut(
    id: string, 
    nouveau_statut: 'En possession' | 'Retourné' | 'Annuler',
    commentaire?: string
  ) {
    const attribution = await this.findOne(id);

    console.log(`\n📝 === CHANGEMENT STATUT ATTRIBUTION ${id} ===`);
    console.log(`Statut actuel: ${attribution.statut_attribution}`);
    console.log(`Nouveau statut: ${nouveau_statut}`);

    if (attribution.statut_attribution === nouveau_statut) {
      throw new BadRequestException(`L'attribution est déjà au statut ${nouveau_statut}`);
    }

    if (nouveau_statut === 'Retourné') {
      return await this.retourner(id, {
        date_retour_effective: new Date(),
        commentaire_retour: commentaire,
      });
    } 
    else if (nouveau_statut === 'Annuler') {
      if (attribution.statut_attribution !== 'En possession') {
        throw new BadRequestException('Seules les attributions en cours peuvent être annulées');
      }

      const mouvements = await this.mouvementService.findByReference('ATTRIBUTION_TEMPORAIRE', id);
      
      if (mouvements.length > 0) {
        await this.mouvementService.create({
          id_materiel: attribution.materiel.id,
          type_mouvement: MouvementType.DERESERVATION,
          quantite_mouvement: attribution.quantite_attribuee,
          id_reference: id,
          type_reference: 'ANNULATION_ATTRIBUTION',
          motif: commentaire || `Annulation attribution ${id}`,
          utilisateur: 'system',
        });

        await this.inventaireService.appliquerRetour(
          attribution.materiel.id,
          attribution.quantite_attribuee,
        );
      } else {
        const cump = await this.inventaireService.getCUMP(attribution.materiel.id);
        
        await this.mouvementService.create({
          id_materiel: attribution.materiel.id,
          type_mouvement: MouvementType.ENTREE,
          quantite_mouvement: attribution.quantite_attribuee,
          prix_unitaire: cump,
          id_reference: id,
          type_reference: 'ANNULATION_ATTRIBUTION_DEFINITIVE',
          motif: commentaire || `Annulation attribution définitive ${id}`,
          utilisateur: 'system',
        });
      }

      await this.attributionRepository.update(id, {
        statut_attribution: 'Annulé',
      });

      console.log(`✅ Attribution ${id} annulée`);
    }
    else if (nouveau_statut === 'En possession') {
      if (attribution.statut_attribution === 'Retourné') {
        throw new BadRequestException('Impossible de réactiver une attribution retournée');
      }

      await this.attributionRepository.update(id, {
        statut_attribution: 'En possession',
      });

      console.log(`✅ Attribution ${id} réactivée`);
    }

    console.log(`=======================================\n`);

    return this.findOne(id);
  }

  async getMaterielsApprouvesByDemandeur(id_demandeur: string) {
    console.log(`\n🔍 === RECHERCHE MATÉRIELS APPROUVÉS ===`);
    console.log(`Demandeur: ${id_demandeur}`);

    const demandes = await this.demandeRepository.find({
      where: {
        demandeur: { id_demandeur },
        statut: 'Approuvée',
      },
      relations: ['detailDemandes', 'detailDemandes.materiel', 'detailDemandes.materiel.typeMateriel'],
    });

    console.log(`${demandes.length} demande(s) approuvée(s) trouvée(s)`);

    const materielsApprouves = demandes.flatMap(demande => 
      (demande.detailDemandes || []).map(detail => ({
        id_detail: detail.id,
        id_demande: demande.id,
        id_materiel: detail.materiel.id,
        designation: detail.materiel.designation,
        type_materiel: detail.materiel.typeMateriel?.designation || 'N/A',
        quantite_demander: detail.quantite_demander,
        type_possession: demande.type_possession,
        date_retour: demande.date_retour,
        date_demande: demande.date_demande,
        raison_demande: demande.raison_demande,
      }))
    );

    console.log(`${materielsApprouves.length} matériel(x) approuvé(s) au total`);
    console.log(`========================================\n`);

    return materielsApprouves;
  }
}