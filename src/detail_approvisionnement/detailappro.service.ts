import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetailApprovisionnement } from './detailappro.entity';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { InventaireService } from '../inventaire/inventaire.service';
import { FournisseurTypeMaterielService } from '../fournisseur_typemateriel/fournisseurtype.service';
import { MaterielService } from '../materiel/materiel.service';
import { ApprovisionnementService } from '../approvisionnement/approvisionnement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';

@Injectable()
export class DetailApprovisionnementService {
  constructor(
    @InjectRepository(DetailApprovisionnement)
    private detailApproRepository: Repository<DetailApprovisionnement>,
    @Inject(forwardRef(() => MouvementStockService))
    private mouvementService: MouvementStockService,
    @Inject(forwardRef(() => InventaireService))
    private inventaireService: InventaireService,
    @Inject(forwardRef(() => FournisseurTypeMaterielService))
    private fournisseurTypeService: FournisseurTypeMaterielService,
    @Inject(forwardRef(() => MaterielService))
    private materielService: MaterielService,
    @Inject(forwardRef(() => ApprovisionnementService))
    private approvisionnementService: ApprovisionnementService,
  ) {}

  async generateId(): Promise<string> {
    const lastDetail = await this.detailApproRepository
      .createQueryBuilder('detail')
      .orderBy('detail.id', 'DESC')
      .limit(1)
      .getOne();

    if (!lastDetail) {
      return 'DAP001';
    }

    const lastNumber = parseInt(lastDetail.id.replace('DAP', ''));
    const newNumber = lastNumber + 1;
    return `DAP${newNumber.toString().padStart(3, '0')}`;
  }

  async create(
    idMateriel: string, 
    idAppro: string, 
    quantiteRecu: number, 
    prixUnitaire: number, 
    quantiteTotal?: number
  ) {
    console.log('\n📦 === CRÉATION DÉTAIL APPROVISIONNEMENT ===');
    
    if (quantiteRecu <= 0) {
      throw new BadRequestException('La quantité reçue doit être supérieure à 0');
    }
    if (prixUnitaire < 0) {
      throw new BadRequestException('Le prix unitaire ne peut pas être négatif');
    }

    const total = quantiteTotal ?? quantiteRecu;

    if (total <= 0) {
      throw new BadRequestException('La quantité totale doit être supérieure à 0');
    }

    const id = await this.generateId();

    const detailAppro = this.detailApproRepository.create({
      id,
      materiel: { id: idMateriel } as any,
      approvisionnement: { id: idAppro } as any,
      quantiteRecu,
      prixUnitaire,
      quantiteTotal: total,
    });

    const saved = await this.detailApproRepository.save(detailAppro);
    console.log(`✅ Détail créé: ${saved.id}`);

    // ✅ CRÉER L'ASSOCIATION FOURNISSEUR ↔ TYPE MATÉRIEL
    try {
      // Récupérer le matériel pour obtenir son type
      const materiel = await this.materielService.findOne(idMateriel);
      if (!materiel) {
        throw new NotFoundException(`Matériel ${idMateriel} non trouvé`);
      }

      // Récupérer l'approvisionnement pour obtenir l'acquisition et le fournisseur
      const approvisionnement = await this.approvisionnementService.findOne(idAppro);
      if (!approvisionnement) {
        throw new NotFoundException(`Approvisionnement ${idAppro} non trouvé`);
      }

      // Vérifier que l'acquisition et le fournisseur existent
      if (approvisionnement.acquisition && approvisionnement.acquisition.fournisseur && materiel.typeMateriel) {
        await this.fournisseurTypeService.createAssociation(
          approvisionnement.acquisition.fournisseur.id,
          materiel.typeMateriel.id,
          `Fourniture ${materiel.designation} - ${new Date().toLocaleDateString('fr-FR')}`
        );
        console.log(`🔗 Association créée: ${approvisionnement.acquisition.fournisseur.nom} ↔ ${materiel.typeMateriel.designation}`);
      }
    } catch (err) {
      console.error('⚠️ Erreur création association:', err.message);
      // Ne pas bloquer la création du détail
    }

    // ✅ MOUVEMENT ENTREE
    await this.mouvementService.create({
      id_materiel: idMateriel,
      type_mouvement: MouvementType.ENTREE,
      quantite_mouvement: quantiteRecu,
      prix_unitaire: prixUnitaire,
      id_reference: idAppro,
      type_reference: 'APPROVISIONNEMENT',
      motif: `Approvisionnement ${idAppro} - Réception de ${quantiteRecu} unités`,
      utilisateur: 'system',
    });
    console.log(`📊 Mouvement ENTREE créé: +${quantiteRecu} unités`);

    console.log('=====================================\n');

    return saved;
  }

  async update(
    id: string, 
    idMateriel: string, 
    idAppro: string, 
    quantiteRecu: number, 
    prixUnitaire: number, 
    quantiteTotal?: number
  ) {
    const detail = await this.findOne(id);

    if (quantiteRecu <= 0) {
      throw new BadRequestException('La quantité reçue doit être supérieure à 0');
    }
    if (prixUnitaire < 0) {
      throw new BadRequestException('Le prix unitaire ne peut pas être négatif');
    }

    const total = quantiteTotal ?? quantiteRecu;

    if (total <= 0) {
      throw new BadRequestException('La quantité totale doit être supérieure à 0');
    }

    const diffQuantite = quantiteRecu - detail.quantiteRecu;

    await this.detailApproRepository.update(id, {
      materiel: { id: idMateriel } as any,
      approvisionnement: { id: idAppro } as any,
      quantiteRecu,
      prixUnitaire,
      quantiteTotal: total,
    });

    // ✅ MOUVEMENT CORRECTION si changement
    if (diffQuantite !== 0) {
      const typeMouvement = diffQuantite > 0 ? MouvementType.ENTREE : MouvementType.SORTIE;
      const typeReference = diffQuantite > 0 ? 'CORRECTION_POSITIVE' : 'CORRECTION_NEGATIVE';
      
      await this.mouvementService.create({
        id_materiel: idMateriel,
        type_mouvement: typeMouvement,
        quantite_mouvement: Math.abs(diffQuantite),
        prix_unitaire: prixUnitaire,
        id_reference: idAppro,
        type_reference: typeReference,
        motif: `Correction approvisionnement ${idAppro} : ${diffQuantite > 0 ? '+' : ''}${diffQuantite} unités`,
        utilisateur: 'system',
      });

      console.log(`✅ Mouvement CORRECTION : ${diffQuantite > 0 ? '+' : ''}${diffQuantite}`);
    }

    return this.findOne(id);
  }

  // ✅ SUPPRESSION avec mouvement SORTIE
  async remove(id: string) {
    const detail = await this.findOne(id);
    
    const idMateriel = detail.materiel.id;
    const quantiteRecu = detail.quantiteRecu;
    const prixUnitaire = detail.prixUnitaire;
    const idAppro = detail.approvisionnement.id;

    console.log(`🗑️ Suppression du détail ${id}`);
    console.log(`   Matériel: ${idMateriel}`);
    console.log(`   Quantité à retirer: ${quantiteRecu}`);
    
    // ✅ CRÉER MOUVEMENT SORTIE
    await this.mouvementService.create({
      id_materiel: idMateriel,
      type_mouvement: MouvementType.SORTIE,
      quantite_mouvement: quantiteRecu,
      prix_unitaire: prixUnitaire,
      id_reference: idAppro,
      type_reference: 'ANNULATION_APPROVISIONNEMENT',
      motif: `Annulation approvisionnement ${idAppro} - Suppression détail ${id}`,
      utilisateur: 'system',
    });

    console.log(`✅ Mouvement SORTIE créé : -${quantiteRecu} unités`);

    // ✅ SUPPRIMER LE DÉTAIL
    await this.detailApproRepository.delete(id);
    
    return { 
      message: 'Détail supprimé avec succès',
      id,
      quantite_retiree: quantiteRecu,
      mouvement_cree: 'SORTIE',
      inventaire_mis_a_jour: true
    };
  }

  async findAll() {
    return await this.detailApproRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition', 'approvisionnement.acquisition.fournisseur'],
      order: { id: 'ASC' }
    });
  }

  async findOne(id: string) {
    const detail = await this.detailApproRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition', 'approvisionnement.acquisition.fournisseur'],
    });

    if (!detail) {
      throw new NotFoundException(`Détail approvisionnement ${id} non trouvé`);
    }

    return detail;
  }

  async findByApprovisionnement(approId: string) {
    return await this.detailApproRepository.find({
      where: { approvisionnement: { id: approId } },
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition', 'approvisionnement.acquisition.fournisseur'],
      order: { id: 'ASC' }
    });
  }

  async getStatsByApprovisionnement(approId: string) {
    const details = await this.findByApprovisionnement(approId);
    
    const stats = {
      totalQuantiteRecu: details.reduce((sum, detail) => sum + detail.quantiteRecu, 0),
      totalQuantiteTotal: details.reduce((sum, detail) => sum + detail.quantiteTotal, 0),
      totalValeur: details.reduce((sum, detail) => sum + (detail.quantiteRecu * Number(detail.prixUnitaire)), 0),
      parTypeMateriel: {}
    };

    details.forEach(detail => {
      const type = detail.materiel.typeMateriel?.designation || 'Non spécifié';
      if (!stats.parTypeMateriel[type]) {
        stats.parTypeMateriel[type] = {
          quantiteRecu: 0,
          quantiteTotal: 0,
          valeur: 0
        };
      }
      stats.parTypeMateriel[type].quantiteRecu += detail.quantiteRecu;
      stats.parTypeMateriel[type].quantiteTotal += detail.quantiteTotal;
      stats.parTypeMateriel[type].valeur += detail.quantiteRecu * Number(detail.prixUnitaire);
    });

    return stats;
  }

  async getTotalByApprovisionnement(approId: string) {
    const result = await this.detailApproRepository
      .createQueryBuilder('detail')
      .select('SUM(detail.quantite_recu)', 'total')
      .where('detail.id_approvisionnement = :approId', { approId })
      .getRawOne();
    
    return parseInt(result.total) || 0;
  }
  
  async getTotalQuantiteRecuByMateriel(id_materiel: string): Promise<number> {
    const result = await this.detailApproRepository
      .createQueryBuilder('detail')
      .select('SUM(detail.quantite_recu)', 'total')
      .where('detail.id_materiel = :id_materiel', { id_materiel })
      .getRawOne();
    
    return parseInt(result.total) || 0;
  }
}
