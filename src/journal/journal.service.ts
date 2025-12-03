import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Journal, StatutValidation } from './journal.entity';
import { MouvementStock } from '../mouvement_stock/mouvement.entity';
import { GrandLivreService } from '../grand_livre/livre.service';

@Injectable()
export class JournalService {
  constructor(
    @InjectRepository(Journal)
    private journalRepository: Repository<Journal>,
    private grandLivreService: GrandLivreService,
  ) {}

  async generateId(): Promise<string> {
    const lastJournal = await this.journalRepository.findOne({
      where: {},
      order: { id_journal: 'DESC' },
    });

    if (!lastJournal) {
      return 'JRN001';
    }

    const lastNumber = parseInt(lastJournal.id_journal.replace('JRN', ''));
    const newNumber = lastNumber + 1;
    return `JRN${newNumber.toString().padStart(3, '0')}`;
  }

  async createFromMouvement(mouvement: MouvementStock): Promise<Journal> {
    const id_journal = await this.generateId();

    // ✅ CORRECTION : Ne pas inclure les propriétés null (TypeScript les considère comme undefined)
    const journal = this.journalRepository.create({
      id_journal: id_journal,
      id_mouvement: mouvement.id,
      statut: StatutValidation.EN_ATTENTE,
    });

    const saved = await this.journalRepository.save(journal);
    
    console.log(`✅ Journal créé automatiquement : ${saved.id_journal} pour mouvement ${mouvement.id}`);
    return saved;
  }

  async findAll() {
    return await this.journalRepository.find({
      relations: ['mouvement', 'mouvement.materiel', 'mouvement.materiel.typeMateriel'],
      order: { date_creation: 'DESC' },
    });
  }

  async findOne(id_journal: string): Promise<Journal> {
    const journal = await this.journalRepository.findOne({
      where: { id_journal },
      relations: ['mouvement', 'mouvement.materiel', 'mouvement.materiel.typeMateriel'],
    });

    if (!journal) {
      throw new NotFoundException(`Journal ${id_journal} non trouvé`);
    }

    return journal;
  }

  async findByStatut(statut: StatutValidation) {
    return await this.journalRepository.find({
      where: { statut },
      relations: ['mouvement', 'mouvement.materiel', 'mouvement.materiel.typeMateriel'],
      order: { date_creation: 'DESC' },
    });
  }

  async getEnAttente() {
    return await this.findByStatut(StatutValidation.EN_ATTENTE);
  }

  async findByPeriode(dateDebut: Date, dateFin: Date) {
    return await this.journalRepository.find({
      where: {
        date_creation: Between(dateDebut, dateFin),
      },
      relations: ['mouvement', 'mouvement.materiel', 'mouvement.materiel.typeMateriel'],
      order: { date_creation: 'DESC' },
    });
  }

  async valider(id_journal: string, id_validateur: string) {
    const journal = await this.findOne(id_journal);

    if (journal.statut !== StatutValidation.EN_ATTENTE) {
      throw new BadRequestException(
        `Ce journal a déjà été traité. Statut actuel: ${journal.statut}`
      );
    }

    journal.statut = StatutValidation.VALIDE;
    journal.id_validateur = id_validateur;
    journal.date_validation = new Date();

   // return await this.journalRepository.save(journal);

    const updated = await this.journalRepository.save(journal);

    //  CRÉER AUTOMATIQUEMENT UNE ENTRÉE AU GRAND LIVRE
    try {
      const journalComplet = await this.findOne(id_journal);
      await this.grandLivreService.createOrUpdateFromJournal(journalComplet);
      console.log(` Entrée grand livre créée pour journal ${id_journal}`);
    } catch (error) {
      console.error(` Erreur lors de la création du grand livre pour ${id_journal}:`, error);
    }

    return updated;
  }
  

  async rejeter(id_journal: string, id_validateur: string, motif_rejet: string) {
    const journal = await this.findOne(id_journal);

    if (journal.statut !== StatutValidation.EN_ATTENTE) {
      throw new BadRequestException(
        `Ce journal a déjà été traité. Statut actuel: ${journal.statut}`
      );
    }

    if (!motif_rejet || motif_rejet.trim().length === 0) {
      throw new BadRequestException('Le motif de rejet est obligatoire');
    }

    journal.statut = StatutValidation.REJETE;
    journal.id_validateur = id_validateur;
    journal.date_validation = new Date();
    journal.motif_rejet = motif_rejet;

    return await this.journalRepository.save(journal);
  }

  async getStatistiques() {
    const total = await this.journalRepository.count();
    const enAttente = await this.journalRepository.count({
      where: { statut: StatutValidation.EN_ATTENTE },
    });
    const valides = await this.journalRepository.count({
      where: { statut: StatutValidation.VALIDE },
    });
    const rejetes = await this.journalRepository.count({
      where: { statut: StatutValidation.REJETE },
    });

    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const aujourdhuiFin = new Date();
    aujourdhuiFin.setHours(23, 59, 59, 999);

    const duJour = await this.journalRepository.count({
      where: {
        date_creation: Between(aujourdHui, aujourdhuiFin),
      },
    });

    const enAttenteDuJour = await this.journalRepository.count({
      where: {
        date_creation: Between(aujourdHui, aujourdhuiFin),
        statut: StatutValidation.EN_ATTENTE,
      },
    });

    return {
      total,
      enAttente,
      valides,
      rejetes,
      tauxValidation: total > 0 ? ((valides / total) * 100).toFixed(2) + '%' : '0%',
      tauxRejet: total > 0 ? ((rejetes / total) * 100).toFixed(2) + '%' : '0%',
      duJour,
      enAttenteDuJour,
    };
  }

  async getDetailComplet(id_journal: string) {
    const journal = await this.findOne(id_journal);

    return {
      id_journal: journal.id_journal,
      statut: journal.statut,
      date_validation: journal.date_validation,
      date_creation: journal.date_creation,
      id_validateur: journal.id_validateur,
      motif_rejet: journal.motif_rejet,
      mouvement: journal.mouvement ? {
        id: journal.mouvement.id,
        type_mouvement: journal.mouvement.type_mouvement,
        quantite_mouvement: journal.mouvement.quantite_mouvement,
        date_mouvement: journal.mouvement.date_mouvement,
        stock_avant: journal.mouvement.stock_avant,
        stock_apres: journal.mouvement.stock_apres,
        prix_unitaire: journal.mouvement.prix_unitaire,
        valeur_totale: journal.mouvement.valeur_totale,
        type_reference: journal.mouvement.type_reference,
        id_reference: journal.mouvement.id_reference,
        motif: journal.mouvement.motif,
        utilisateur: journal.mouvement.utilisateur,
        materiel: journal.mouvement.materiel ? {
          id: journal.mouvement.materiel.id,
          designation: journal.mouvement.materiel.designation,
          type_materiel: journal.mouvement.materiel.typeMateriel?.designation,
        } : null,
      } : null,
    };
  }
}