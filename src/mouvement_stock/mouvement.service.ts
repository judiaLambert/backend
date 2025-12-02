import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MouvementStock, MouvementType } from './mouvement.entity';
import { Inventaire } from '../inventaire/inventaire.entity';
import { Materiel, CategorieMateriel } from '../materiel/materiel.entity';
import { JournalService } from '../journal/journal.service';

@Injectable()
export class MouvementStockService {
  constructor(
    @InjectRepository(MouvementStock)
    private mouvementRepository: Repository<MouvementStock>,
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    private journalService: JournalService,
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

  // 2. CALCULER LE STOCK_AVANT SELON LA CATÉGORIE
  if (materiel.categorie_materiel === CategorieMateriel.DURABLE) {
    console.log(` Matériel DURABLE - Récupération stock depuis inventaire`);
    const inventaire = await this.inventaireRepository.findOne({
      where: { materiel: { id: mouvementData.id_materiel } },
      relations: ['materiel'],
    });
    stock_avant = Number(inventaire?.quantite_stock ?? 0);
    console.log(`   Stock inventaire : ${stock_avant}`);
  } else {
    console.log(` Matériel CONSOMMABLE - Récupération stock depuis dernier mouvement`);
    const dernierMouvement = await this.mouvementRepository.findOne({
      where: { materiel: { id: mouvementData.id_materiel } },
      order: { date_mouvement: 'DESC' },
    });
    stock_avant = Number(dernierMouvement?.stock_apres ?? 0);
    console.log(`   Stock dernier mouvement : ${stock_avant}`);
  }

  // 3. CALCULER LE STOCK_APRES (en nombres)
  const stock_apres = this.calculateNewStock(
    Number(stock_avant),
    mouvementData.type_mouvement,
    Number(mouvementData.quantite_mouvement),
  );

  if (stock_apres < 0) {
    throw new BadRequestException(
      `Stock insuffisant ! Stock actuel: ${stock_avant}, Quantité demandée: ${mouvementData.quantite_mouvement}. Stock après serait: ${stock_apres}`,
    );
  }

  console.log(`   Stock avant : ${stock_avant}`);
  console.log(`   Mouvement : ${mouvementData.type_mouvement} ${mouvementData.quantite_mouvement}`);
  console.log(`   Stock après : ${stock_apres}`);




    // Calculer la valeur totale
    const valeur_totale = mouvementData.prix_unitaire
      ? mouvementData.prix_unitaire * mouvementData.quantite_mouvement
      : null;

    const mouvement = this.mouvementRepository.create({
      id,
      materiel: { id: mouvementData.id_materiel } as any,
      type_mouvement: mouvementData.type_mouvement,
      quantite_mouvement: mouvementData.quantite_mouvement,
      id_reference: mouvementData.id_reference,
      type_reference: mouvementData.type_reference,
      prix_unitaire: mouvementData.prix_unitaire,
      valeur_totale: valeur_totale ?? undefined,
      motif: mouvementData.motif,
      utilisateur: mouvementData.utilisateur,
      stock_avant,
      stock_apres,
    });

    // ✅ 4. Sauvegarder le mouvement
    const savedMouvement = await this.mouvementRepository.save(mouvement);
    console.log(`✅ Mouvement créé : ${savedMouvement.id}`);

    // ✅ 5. CRÉER JOURNAL UNIQUEMENT POUR MATÉRIELS DURABLES
    try {
      if (materiel.categorie_materiel === CategorieMateriel.DURABLE) {
        // Recharger le mouvement avec toutes les relations
        const mouvementComplet = await this.mouvementRepository.findOne({
          where: { id: savedMouvement.id },
          relations: ['materiel', 'materiel.typeMateriel'],
        });

        if (mouvementComplet) {
          const journal = await this.journalService.createFromMouvement(mouvementComplet);
          console.log(`✅ Journal créé pour matériel DURABLE : ${journal.id_journal} (mouvement ${mouvementComplet.id})`);
        }
      } else {
        console.log(`⏭️  Matériel CONSOMMABLE "${materiel.designation}" - Pas de journal créé pour mouvement ${savedMouvement.id}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la création du journal pour le mouvement ${savedMouvement.id}:`, error);
      // On ne bloque pas la création du mouvement si le journal échoue
    }

    // ✅ 6. Retourner le mouvement sauvegardé
    return savedMouvement;
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
      select: ['id', 'date_mouvement', 'type_mouvement', 'quantite_mouvement', 'stock_avant', 'stock_apres', 'type_reference'],
      order: { date_mouvement: 'ASC' },
    });
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Obtenir uniquement les mouvements de matériels DURABLES
   */
  async getMouvementsDurables() {
    return await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .where('materiel.categorie_materiel = :categorie', { categorie: CategorieMateriel.DURABLE })
      .orderBy('mouvement.date_mouvement', 'DESC')
      .getMany();
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Obtenir uniquement les mouvements de matériels CONSOMMABLES
   */
  async getMouvementsConsommables() {
    return await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .where('materiel.categorie_materiel = :categorie', { categorie: CategorieMateriel.CONSOMMABLE })
      .orderBy('mouvement.date_mouvement', 'DESC')
      .getMany();
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Obtenir le stock actuel d'un matériel consommable
   */
  async getStockConsommable(id_materiel: string): Promise<number> {
    const dernierMouvement = await this.mouvementRepository.findOne({
      where: { materiel: { id: id_materiel } },
      order: { date_mouvement: 'DESC' },
    });

    return dernierMouvement?.stock_apres || 0;
  }
}
