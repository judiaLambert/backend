import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultatRecensement } from './resultat.entity';
import { Inventaire } from '../inventaire/inventaire.entity';

@Injectable()
export class ResultatRecensementService {
  constructor(
    @InjectRepository(ResultatRecensement)
    private resultatRepository: Repository<ResultatRecensement>,
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
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

  async create(
    id_commission: string,
    id_inventaire: string,
    quantite_physique: number,
    type_recensement: string,
    date_recensement: Date,
    description_ecart?: string,
  ) {
    // Récupérer la quantité théorique depuis l'inventaire
    const inventaire = await this.inventaireRepository.findOne({
      where: { id: id_inventaire },
      relations: ['materiel'],
    });

    if (!inventaire) {
      throw new NotFoundException(`Inventaire ${id_inventaire} non trouvé`);
    }

    const quantite_theorique = inventaire.quantite_stock;
    const ecart_trouve = quantite_physique - quantite_theorique;

    const id = await this.generateId();

    const resultat = this.resultatRepository.create({
      id,
      commission: { id: id_commission } as any,
      inventaire: { id: id_inventaire } as any,
      quantite_theorique,
      quantite_physique,
      ecart_trouve,
      description_ecart,
      type_recensement,
      date_recensement,
      statut_correction: 'en_attente',
    });

    return await this.resultatRepository.save(resultat);
  }

  async findAll() {
    return await this.resultatRepository.find({
      relations: ['commission', 'inventaire', 'inventaire.materiel', 'inventaire.materiel.typeMateriel'],
      order: { date_recensement: 'DESC' },
    });
  }

  async findOne(id: string) {
    const resultat = await this.resultatRepository.findOne({
      where: { id },
      relations: ['commission', 'inventaire', 'inventaire.materiel', 'inventaire.materiel.typeMateriel'],
    });

    if (!resultat) {
      throw new NotFoundException(`Résultat ${id} non trouvé`);
    }

    return resultat;
  }

  async findByCommission(id_commission: string) {
    return await this.resultatRepository.find({
      where: { commission: { id: id_commission } },
      relations: ['inventaire', 'inventaire.materiel', 'inventaire.materiel.typeMateriel'],
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

    // Recalculer l'écart si quantité physique change
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

    // Mettre à jour l'inventaire
    const nouvelleQuantite = resultat.quantite_physique;
    
    await this.inventaireRepository.update(resultat.inventaire.id, {
      quantite_stock: nouvelleQuantite,
      quantite_disponible: nouvelleQuantite - resultat.inventaire.quantite_reservee,
    });

    // Enregistrer la traçabilité
    await this.resultatRepository.update(id, {
      statut_correction: 'corrige',
      corrige_par,
      date_correction: new Date(),
    });

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

    return {
      total,
      enAttente,
      valides,
      corriges,
      rejetes,
      ecarts,
      conformes: total - ecarts,
    };
  }
}
