import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultatRecensement } from './resultat.entity';
import { Inventaire } from '../inventaire/inventaire.entity';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';

@Injectable()
export class ResultatRecensementService {
  constructor(
    @InjectRepository(ResultatRecensement)
    private resultatRepository: Repository<ResultatRecensement>,
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
    private mouvementService: MouvementStockService,
  ) {}

  async generateId(): Promise<string> {
    const lastResultat = await this.resultatRepository
      .createQueryBuilder('resultat')
      .orderBy('resultat.id', 'DESC')
      .limit(1)
      .getOne();

    if (!lastResultat) {
      return 'RES001';
    }

    const lastNumber = parseInt(lastResultat.id.replace('RES', ''));
    const newNumber = lastNumber + 1;
    return `RES${newNumber.toString().padStart(3, '0')}`;
  }

  // ✅ Récupérer le CUMP depuis l'inventaire
  async getPrixUnitaireSysteme(id_materiel: string): Promise<number> {
    return await this.mouvementService.getCUMP(id_materiel);
  }

  async create(
    id_commission: string,
    id_inventaire: string,
    quantite_physique: number,
    type_recensement: string,
    date_recensement: Date,
    description_ecart?: string,
  ) {
    const inventaire = await this.inventaireRepository.findOne({
      where: { id: id_inventaire },
      relations: ['materiel'],
    });

    if (!inventaire) {
      throw new NotFoundException(`Inventaire ${id_inventaire} non trouvé`);
    }

    const quantite_theorique = inventaire.quantite_stock;
    const ecart_trouve = quantite_physique - quantite_theorique;

    // ✅ Récupérer le CUMP actuel du matériel depuis l'inventaire
    const pu_systeme = await this.getPrixUnitaireSysteme(inventaire.materiel.id);

    // ✅ Calcul de la valeur système
    const valeur_systeme = quantite_theorique * pu_systeme;

    const id = await this.generateId();

    const resultat = this.resultatRepository.create({
      id,
      commission: { id: id_commission } as any,
      inventaire: { id: id_inventaire } as any,
      quantite_theorique,
      quantite_physique,
      ecart_trouve,
      pu_systeme,
      valeur_systeme,
      description_ecart,
      type_recensement,
      date_recensement,
      statut_correction: 'en_attente',
    });

    console.log(`📋 Résultat recensement créé:`);
    console.log(`   Quantité théorique: ${quantite_theorique}`);
    console.log(`   Quantité physique: ${quantite_physique}`);
    console.log(`   Écart: ${ecart_trouve}`);
    console.log(`   PU système (CUMP): ${pu_systeme} Ar`);
    console.log(`   Valeur système: ${valeur_systeme} Ar`);
    console.log(`   Valeur écart: ${ecart_trouve * pu_systeme} Ar`);

    return await this.resultatRepository.save(resultat);
  }

  async findAll() {
    const resultats = await this.resultatRepository.find({
      relations: [
        'commission',
        'inventaire',
        'inventaire.materiel',
        'inventaire.materiel.typeMateriel',
      ],
      order: { date_recensement: 'DESC' },
    });

    return resultats;
  }

  async findOne(id: string) {
    const resultat = await this.resultatRepository.findOne({
      where: { id },
      relations: [
        'commission',
        'inventaire',
        'inventaire.materiel',
        'inventaire.materiel.typeMateriel',
      ],
    });

    if (!resultat) {
      throw new NotFoundException(`Résultat ${id} non trouvé`);
    }

    return resultat;
  }

  async findByCommission(id_commission: string) {
    return await this.resultatRepository.find({
      where: { commission: { id: id_commission } },
      relations: [
        'inventaire',
        'inventaire.materiel',
        'inventaire.materiel.typeMateriel',
      ],
      order: { date_recensement: 'DESC' },
    });
  }

  async update(
    id: string,
    updateData: {
      quantite_physique?: number;
      description_ecart?: string;
      statut_correction?: string;
    },
  ) {
    const resultat = await this.findOne(id);

    const dataToUpdate: any = { ...updateData };

    // ✅ Recalculer l'écart si la quantité physique change
    if (updateData.quantite_physique !== undefined) {
      dataToUpdate.ecart_trouve = updateData.quantite_physique - resultat.quantite_theorique;
    }

    await this.resultatRepository.update(id, dataToUpdate);
    return this.findOne(id);
  }

  async valider(id: string) {
    const resultat = await this.findOne(id);

    if (resultat.statut_correction !== 'en_attente') {
      throw new BadRequestException('Ce résultat a déjà été traité');
    }

    await this.resultatRepository.update(id, {
      statut_correction: 'valide',
    });

    return this.findOne(id);
  }

  async rejeter(id: string) {
    const resultat = await this.findOne(id);

    if (resultat.statut_correction !== 'en_attente') {
      throw new BadRequestException('Ce résultat a déjà été traité');
    }

    await this.resultatRepository.update(id, {
      statut_correction: 'rejete',
    });

    return this.findOne(id);
  }

 async appliquerCorrection(id: string, corrige_par: string) {
  const resultat = await this.findOne(id);

  if (resultat.statut_correction !== 'valide') {
    throw new BadRequestException('Le résultat doit être validé avant correction');
  }

  if (resultat.ecart_trouve === 0) {
    throw new BadRequestException('Aucun écart à corriger');
  }

  const typeMouvement = resultat.ecart_trouve > 0 
    ? MouvementType.ENTREE 
    : MouvementType.SORTIE;

  const typeReference = resultat.ecart_trouve > 0 
    ? 'CORRECTION_POSITIVE' 
    : 'CORRECTION_NEGATIVE';

  const quantite_abs = Math.abs(resultat.ecart_trouve);

  // ✅ CORRECTION : Convertir en nombre avant toFixed()
  const pu_systeme_num = Number(resultat.pu_systeme) || 0;
  const valeur_systeme_num = Number(resultat.valeur_systeme) || 0;

  console.log(`\n🔧 === APPLICATION CORRECTION ${id} ===`);
  console.log(`Type: ${typeMouvement}`);
  console.log(`Quantité: ${quantite_abs}`);
  console.log(`PU système (avant correction): ${pu_systeme_num.toFixed(2)} Ar`);
  console.log(`Valeur système (avant correction): ${valeur_systeme_num.toFixed(2)} Ar`);

  // ✅ Créer le mouvement de correction avec la valeur numérique
  await this.mouvementService.create({
    id_materiel: resultat.inventaire.materiel.id,
    type_mouvement: typeMouvement,
    quantite_mouvement: quantite_abs,
    prix_unitaire: pu_systeme_num,  // ✅ Utiliser la valeur convertie
    id_reference: resultat.id,
    type_reference: typeReference,
    motif: resultat.description_ecart || 
      `Correction recensement - ${resultat.ecart_trouve > 0 ? 'surplus' : 'manquant'} de ${quantite_abs} unités`,
    utilisateur: corrige_par,
  });

  // ✅ Mettre à jour la date du dernier inventaire
  await this.inventaireRepository.update(resultat.inventaire.id, {
    date_dernier_inventaire: new Date(),
  });

  // ✅ Marquer comme corrigé
  await this.resultatRepository.update(id, {
    statut_correction: 'corrige',
    corrige_par,
    date_correction: new Date(),
  });

  // ✅ Recalculer et mettre à jour la valeur système APRÈS correction
  const inventaireApres = await this.inventaireRepository.findOne({
    where: { id: resultat.inventaire.id },
    relations: ['materiel'],
  });

  if (!inventaireApres) {
    throw new NotFoundException(`Inventaire ${resultat.inventaire.id} introuvable après correction`);
  }

  const cump_apres = await this.getPrixUnitaireSysteme(inventaireApres.materiel.id);
  const valeur_systeme_apres = inventaireApres.quantite_stock * cump_apres;

  console.log(`\n📊 === APRÈS CORRECTION ===`);
  console.log(`Stock après: ${inventaireApres.quantite_stock}`);
  console.log(`CUMP après: ${cump_apres.toFixed(2)} Ar`);
  console.log(`Valeur système après: ${valeur_systeme_apres.toFixed(2)} Ar`);

  // ✅ Mettre à jour le résultat avec les nouvelles valeurs
  await this.resultatRepository.update(id, {
    pu_systeme: cump_apres,
    valeur_systeme: valeur_systeme_apres,
    quantite_theorique: inventaireApres.quantite_stock,
  });

  console.log(`✅ Correction appliquée et valeur système mise à jour\n`);

  return this.findOne(id);
}



  async remove(id: string) {
    const resultat = await this.findOne(id);

    if (resultat.statut_correction === 'corrige') {
      throw new BadRequestException('Impossible de supprimer un résultat déjà corrigé');
    }

    return await this.resultatRepository.delete(id);
  }

  async getStatistiques() {
    const total = await this.resultatRepository.count();

    const enAttente = await this.resultatRepository.count({
      where: { statut_correction: 'en_attente' },
    });

    const valides = await this.resultatRepository.count({
      where: { statut_correction: 'valide' },
    });

    const corriges = await this.resultatRepository.count({
      where: { statut_correction: 'corrige' },
    });

    const rejetes = await this.resultatRepository.count({
      where: { statut_correction: 'rejete' },
    });

    const ecarts = await this.resultatRepository
      .createQueryBuilder('resultat')
      .where('resultat.ecart_trouve != 0')
      .getCount();

    // ✅ Valeur totale des écarts (pertes et surplus)
    const valeursEcarts = await this.resultatRepository
      .createQueryBuilder('resultat')
      .select('SUM(ABS(resultat.ecart_trouve * resultat.pu_systeme))', 'valeur_totale_ecarts') 
      .getRawOne();

    return {
      total,
      enAttente,
      valides,
      corriges,
      rejetes,
      ecarts,
      conformes: total - ecarts,
      valeur_totale_ecarts: parseFloat(valeursEcarts.valeur_totale_ecarts) || 0,
    };
  }
}
