import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MouvementStock, MouvementType } from './mouvement.entity';
import { Inventaire } from '../inventaire/inventaire.entity';

@Injectable()
export class MouvementStockService {
  constructor(
    @InjectRepository(MouvementStock)
    private mouvementRepository: Repository<MouvementStock>,
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
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

    // Récupérer le stock actuel
    const inventaire = await this.inventaireRepository.findOne({
      where: { materiel: { id: mouvementData.id_materiel } },
      relations: ['materiel']
    });

    const stock_avant = inventaire?.quantite_stock || 0;
    const stock_apres = this.calculateNewStock(
      stock_avant,
      mouvementData.type_mouvement,
      mouvementData.quantite_mouvement,
    );

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

    return await this.mouvementRepository.save(mouvement);
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
        return stock_avant; // Pas de changement du stock total
    }
  }

  async findAll() {
    return await this.mouvementRepository.find({
      relations: ['materiel', 'materiel.typeMateriel'],
      order: { date_mouvement: 'DESC' },
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

    // Mouvements par type
    const mouvementsParType = await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .select('mouvement.type_mouvement', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(mouvement.quantite_mouvement)', 'totalQuantite')
      .groupBy('mouvement.type_mouvement')
      .getRawMany();

    // Valeur totale des mouvements
    const valeurTotale = await this.mouvementRepository
      .createQueryBuilder('mouvement')
      .select('SUM(mouvement.valeur_totale)', 'total')
      .getRawOne();

    // Mouvements du jour
    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);
    const mouvementsDuJour = await this.mouvementRepository.count({
      where: {
        date_mouvement: Between(aujourd_hui, new Date()),
      },
    });

    // Top 5 matériels avec le plus de mouvements
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
}
