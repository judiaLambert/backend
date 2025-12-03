import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MouvementStock, MouvementType } from './mouvement.entity';
import { Inventaire } from '../inventaire/inventaire.entity';
import { Materiel, CategorieMateriel } from '../materiel/materiel.entity';
import { JournalService } from '../journal/journal.service';
import { InventaireService } from '../inventaire/inventaire.service';

@Injectable()
export class MouvementStockService {
  constructor(
    @InjectRepository(MouvementStock)
    private mouvementRepository: Repository<MouvementStock>,
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    @Inject(forwardRef(() => JournalService))
    private journalService: JournalService,
    @Inject(forwardRef(() => InventaireService))
    private inventaireService: InventaireService,
  ) {}

  async generateId(): Promise<string> {
    const lastMouvement = await this.mouvementRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });

    if (!lastMouvement) {
      return 'MV001';
    }

    const lastNumber = parseInt(lastMouvement.id.replace('MV', ''));
    const newNumber = lastNumber + 1;
    return `MV${newNumber.toString().padStart(3, '0')}`;
  }

// ✅ EXTRAIT CORRIGÉ de la méthode create() dans MouvementStockService

async create(mouvementData: {
  id_materiel: string;
  type_mouvement: MouvementType;
  quantite_mouvement: number;
  id_reference?: string;
  type_reference?: string;
  prix_unitaire?: number;
  motif?: string;
  utilisateur?: string;
}) {
  const id = await this.generateId();

  const materiel = await this.materielRepository.findOne({
    where: { id: mouvementData.id_materiel },
  });

  if (!materiel) {
    throw new Error(`Matériel ${mouvementData.id_materiel} non trouvé`);
  }

  let stock_avant = 0;
  let inventaire: Inventaire | null = null;

  if (materiel.categorie_materiel === CategorieMateriel.DURABLE) {
    console.log(`📦 Matériel DURABLE - Récupération stock depuis inventaire`);
    inventaire = await this.inventaireRepository.findOne({
      where: { materiel: { id: mouvementData.id_materiel } },
      relations: ['materiel'],
    });
    stock_avant = Number(inventaire?.quantite_stock ?? 0);
    console.log(`   Stock inventaire : ${stock_avant}`);
  } else {
    console.log(`🔧 Matériel CONSOMMABLE - Récupération stock depuis dernier mouvement`);
    const dernierMouvement = await this.mouvementRepository.findOne({
      where: { materiel: { id: mouvementData.id_materiel } },
      order: { date_mouvement: 'DESC' },
    });
    stock_avant = Number(dernierMouvement?.stock_apres ?? 0);
    console.log(`   Stock dernier mouvement : ${stock_avant}`);
  }

  // 2. CALCULER LE STOCK_APRES
  const stock_apres = this.calculateNewStock(
    Number(stock_avant),
    mouvementData.type_mouvement,
    Number(mouvementData.quantite_mouvement),
  );

  if (stock_apres < 0) {
    throw new BadRequestException(
      `Stock insuffisant ! Stock actuel: ${stock_avant}, Quantité demandée: ${mouvementData.quantite_mouvement}`,
    );
  }

  // ✅ 3. CALCULER LA VALEUR TOTALE DU MOUVEMENT
  // Important : Utiliser le prix_unitaire fourni ou le CUMP de l'inventaire
  let prix_unitaire_final = mouvementData.prix_unitaire;
  let valeur_totale: number | null = null;

  if (mouvementData.type_mouvement === MouvementType.ENTREE) {
    // Pour une ENTRÉE, on DOIT avoir un prix unitaire
    if (!prix_unitaire_final || prix_unitaire_final <= 0) {
      throw new BadRequestException(
        'Le prix unitaire est obligatoire pour une entrée de stock'
      );
    }
    valeur_totale = prix_unitaire_final * mouvementData.quantite_mouvement;
    console.log(`✅ ENTRÉE - Prix unitaire: ${prix_unitaire_final}, Valeur: ${valeur_totale}`);
  } else if (mouvementData.type_mouvement === MouvementType.SORTIE) {
    // Pour une SORTIE, on utilise le CUMP de l'inventaire
    if (inventaire && inventaire.quantite_stock > 0) {
      const cump = Number(inventaire.valeur_stock) / Number(inventaire.quantite_stock);
      prix_unitaire_final = cump;
      valeur_totale = cump * mouvementData.quantite_mouvement;
      console.log(`✅ SORTIE - CUMP: ${cump}, Valeur: ${valeur_totale}`);
    } else {
      // Pas d'inventaire ou stock à 0
      prix_unitaire_final = 0;
      valeur_totale = 0;
      console.log(`⚠️ SORTIE - Pas de CUMP disponible`);
    }
  }

  console.log(`   Stock avant : ${stock_avant}`);
  console.log(`   Mouvement : ${mouvementData.type_mouvement} ${mouvementData.quantite_mouvement}`);
  console.log(`   Stock après : ${stock_apres}`);
  console.log(`   Prix unitaire final : ${prix_unitaire_final}`);
  console.log(`   Valeur totale : ${valeur_totale}`);

  const mouvement = this.mouvementRepository.create({
    id,
    materiel: { id: mouvementData.id_materiel } as any,
    type_mouvement: mouvementData.type_mouvement,
    quantite_mouvement: mouvementData.quantite_mouvement,
    id_reference: mouvementData.id_reference,
    type_reference: mouvementData.type_reference,
    prix_unitaire: prix_unitaire_final || 0,
    valeur_totale: valeur_totale || 0,        
    motif: mouvementData.motif,
    utilisateur: mouvementData.utilisateur,
    stock_avant,
    stock_apres,
  });

  // 4. SAUVEGARDER LE MOUVEMENT
  const savedMouvement = await this.mouvementRepository.save(mouvement);
  console.log(` Mouvement créé : ${savedMouvement.id}`);

  // 5.  METTRE À JOUR L'INVENTAIRE SEULEMENT S'IL EXISTE (DURABLE)
  if (materiel.categorie_materiel === CategorieMateriel.DURABLE && inventaire) {
    await this.updateInventaireWithValeur(
      inventaire,
      mouvementData.type_mouvement,
      mouvementData.quantite_mouvement,
      valeur_totale,
    );
  }

  // 6. CRÉER JOURNAL UNIQUEMENT POUR MATÉRIELS DURABLES
  try {
    if (materiel.categorie_materiel === CategorieMateriel.DURABLE) {
      const mouvementComplet = await this.mouvementRepository.findOne({
        where: { id: savedMouvement.id },
        relations: ['materiel', 'materiel.typeMateriel'],
      });

      if (mouvementComplet) {
        const journal = await this.journalService.createFromMouvement(mouvementComplet);
        console.log(` Journal créé pour matériel DURABLE : ${journal.id_journal}`);
      }
    } else {
      console.log(`  Matériel CONSOMMABLE - Pas de journal créé`);
    }
  } catch (error) {
    console.error(` Erreur création journal:`, error);
  }

  return savedMouvement;
}

  private async updateInventaireWithValeur(
    inventaire: Inventaire,
    type_mouvement: MouvementType,
    quantite: number,
    valeur_mouvement: number | null,
  ) {
    const valeur_actuelle = Number(inventaire.valeur_stock || 0);
    const quantite_actuelle = Number(inventaire.quantite_stock || 0);

    let nouvelle_valeur = valeur_actuelle;
    let nouvelle_quantite = quantite_actuelle;

    if (type_mouvement === MouvementType.ENTREE) {
      if (valeur_mouvement) {
        nouvelle_valeur = valeur_actuelle + valeur_mouvement;
        nouvelle_quantite = quantite_actuelle + quantite;
      }
      console.log(`💰 ENTRÉE - Valeur avant: ${valeur_actuelle} → après: ${nouvelle_valeur}`);
    } else if (type_mouvement === MouvementType.SORTIE) {
      const cump_actuel = quantite_actuelle > 0 ? valeur_actuelle / quantite_actuelle : 0;
      const valeur_sortie = quantite * cump_actuel;
      nouvelle_valeur = valeur_actuelle - valeur_sortie;
      nouvelle_quantite = quantite_actuelle - quantite;
      console.log(`💸 SORTIE - CUMP: ${cump_actuel.toFixed(2)} - Valeur sortie: ${valeur_sortie.toFixed(2)}`);
      console.log(`   Valeur avant: ${valeur_actuelle} → après: ${nouvelle_valeur.toFixed(2)}`);
    }

    await this.inventaireRepository.update(inventaire.id, {
      quantite_stock: nouvelle_quantite,
      valeur_stock: nouvelle_valeur,
      quantite_disponible: nouvelle_quantite - (inventaire.quantite_reservee || 0),
      date_mise_a_jour: new Date(),
    });

    console.log(`✅ Inventaire mis à jour : qté=${nouvelle_quantite}, valeur=${nouvelle_valeur.toFixed(2)} Ar`);
    console.log(
      `   CUMP actuel : ${
        nouvelle_quantite > 0 ? (nouvelle_valeur / nouvelle_quantite).toFixed(2) : 0
      } Ar/unité`,
    );
  }

  private calculateNewStock(
    stock_avant: number,
    type_mouvement: MouvementType,
    quantite: number,
  ): number {
    switch (type_mouvement) {
      case MouvementType.ENTREE:
        return stock_avant + quantite;
      case MouvementType.SORTIE:
        return stock_avant - quantite;
      case MouvementType.TRANSFERT:
      case MouvementType.RESERVATION:
      case MouvementType.DERESERVATION:
      case MouvementType.AUTRE:
      default:
        return stock_avant;
    }
  }

  async getCUMP(id_materiel: string): Promise<number> {
    const inventaire = await this.inventaireRepository.findOne({
      where: { materiel: { id: id_materiel } },
    });

    if (!inventaire || inventaire.quantite_stock === 0) {
      return 0;
    }

    const valeur = Number(inventaire.valeur_stock || 0);
    const quantite = Number(inventaire.quantite_stock || 0);

    return quantite > 0 ? valeur / quantite : 0;
  }

  async findAll() {
    return await this.mouvementRepository.find({
      relations: ['materiel', 'materiel.typeMateriel'],
      order: { date_mouvement: 'DESC' },
    });
  }

  async findOne(id: string) {
    return await this.mouvementRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel'],
    });
  }

  async findByMateriel(id_materiel: string) {
    return await this.mouvementRepository.find({
      where: { materiel: { id: id_materiel } },
      relations: ['materiel', 'materiel.typeMateriel'],
      order: { date_mouvement: 'DESC' },
    });
  }

  async findByReference(type_reference: string, id_reference: string) {
    return await this.mouvementRepository.find({
      where: { type_reference, id_reference },
      relations: ['materiel', 'materiel.typeMateriel'],
      order: { date_mouvement: 'ASC' },
    });
  }

  async getMouvementsRecent(limit: number = 100) {
    return await this.mouvementRepository.find({
      relations: ['materiel', 'materiel.typeMateriel'],
      order: { date_mouvement: 'DESC' },
      take: limit,
    });
  }

  async getMouvementsByPeriod(dateDebut: Date, dateFin: Date) {
    return await this.mouvementRepository.find({
      where: {
        date_mouvement: Between(dateDebut, dateFin),
      },
      relations: ['materiel', 'materiel.typeMateriel'],
      order: { date_mouvement: 'DESC' },
    });
  }

  async getStatistiques() {
    const totalMouvements = await this.mouvementRepository.count();

    const mouvementsParType = await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .select('mouvement.type_mouvement', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(mouvement.quantite_mouvement)', 'totalQuantite')
      .groupBy('mouvement.type_mouvement')
      .getRawMany();

    const valeurTotale = await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .select('SUM(mouvement.valeur_totale)', 'total')
      .getRawOne();

    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);
    const mouvementsDuJour = await this.mouvementRepository.count({
      where: {
        date_mouvement: Between(aujourd_hui, new Date()),
      },
    });

    const topMateriels = await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .select('materiel.designation', 'designation')
      .addSelect('COUNT(*)', 'count')
      .groupBy('materiel.id')
      .addGroupBy('materiel.designation')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalMouvements,
      mouvementsParType,
      valeurTotale: parseFloat(valeurTotale.total) || 0,
      mouvementsDuJour,
      topMateriels,
    };
  }

  async getEvolutionStock(id_materiel: string) {
    return await this.mouvementRepository.find({
      where: { materiel: { id: id_materiel } },
      select: [
        'id',
        'date_mouvement',
        'type_mouvement',
        'quantite_mouvement',
        'stock_avant',
        'stock_apres',
        'type_reference',
      ],
      order: { date_mouvement: 'ASC' },
    });
  }

  async getMouvementsDurables() {
    return await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .where('materiel.categorie_materiel = :categorie', {
        categorie: CategorieMateriel.DURABLE,
      })
      .orderBy('mouvement.date_mouvement', 'DESC')
      .getMany();
  }

  async getMouvementsConsommables() {
    return await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .where('materiel.categorie_materiel = :categorie', {
        categorie: CategorieMateriel.CONSOMMABLE,
      })
      .orderBy('mouvement.date_mouvement', 'DESC')
      .getMany();
  }

  async getStockConsommable(id_materiel: string): Promise<number> {
    const dernierMouvement = await this.mouvementRepository.findOne({
      where: { materiel: { id: id_materiel } },
      order: { date_mouvement: 'DESC' },
    });

    return dernierMouvement?.stock_apres || 0;
  }
}
