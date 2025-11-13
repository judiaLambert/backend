import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Depannage } from './depannage.entity';
import { MaterielService } from '../materiel/materiel.service';

@Injectable()
export class DepannageService {
  constructor(
    @InjectRepository(Depannage)
    private depannageRepository: Repository<Depannage>,
    private materielService: MaterielService,
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

  private async updateEtatMateriel(id_materiel: string, statut_depannage: string) {
    let nouvelEtatDesignation: string;
    
    switch (statut_depannage) {
      case 'Signalé':
        nouvelEtatDesignation = 'en panne';
        break;
      case 'En cours':
        nouvelEtatDesignation = 'en maintenance'; 
        break;
      case 'Irréparable':
        nouvelEtatDesignation = 'Hors service';
        break;
      case 'Résolu': 
        nouvelEtatDesignation = 'disponible ';
        break;
      default:
        console.log('⚠️ Statut non reconnu:', statut_depannage);
        return;
    }
    
    console.log('🔍 Nouvel état recherché:', nouvelEtatDesignation);
    
    try {
      const tousLesEtats = await this.materielService.getEtatsMateriel();
      console.log('📋 TOUS LES ÉTATS DISPONIBLES:', tousLesEtats.map(e => e.designation));
      
      const etatCorrespondant = await this.materielService.findEtatByDesignation(nouvelEtatDesignation);
      
      console.log('✓ État correspondant trouvé:', etatCorrespondant);
      
      if (etatCorrespondant) {
        console.log('🔄 Mise à jour matériel vers:', etatCorrespondant.designation);
        await this.materielService.updateEtat(id_materiel, etatCorrespondant.id);
        console.log('✅ Matériel mis à jour avec succès');
      } else {
        console.log('❌ État non trouvé pour:', nouvelEtatDesignation);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
    }
  }

  async create(
    id_materiel: string,
    id_demandeur: string,
    date_signalement: Date,
    description_panne: string,
    statut_depannage: string,
  ) {
    // Validation des données obligatoires
    if (!id_materiel) {
      throw new BadRequestException('Le matériel est obligatoire');
    }
    if (!id_demandeur) {
      throw new BadRequestException('Le demandeur est obligatoire');
    }
    if (!description_panne) {
      throw new BadRequestException('La description de la panne est obligatoire');
    }

    // VÉRIFICATION : Le demandeur existe-t-il vraiment ?
    const demandeurExists = await this.depannageRepository.manager
      .getRepository('Demandeur')
      .findOne({ where: { id_demandeur: id_demandeur } });
    
    if (!demandeurExists) {
      throw new BadRequestException(
        `Le demandeur avec l'ID "${id_demandeur}" n'existe pas dans la base de données. ` +
        `Vérifiez que la clé primaire "id_demandeur" est correcte.`
      );
    }

    // VÉRIFICATION : Le matériel existe-t-il vraiment ?
    const materielExists = await this.depannageRepository.manager
      .getRepository('Materiel')
      .findOne({ where: { id: id_materiel } });
    
    if (!materielExists) {
      throw new BadRequestException(
        `Le matériel avec l'ID "${id_materiel}" n'existe pas dans la base de données.`
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
    console.log('✅ Demandeur trouvé:', demandeurExists);
    console.log('✅ Matériel trouvé:', materielExists);

    const depannage = this.depannageRepository.create({
      id,
      id_materiel,
      id_demandeur,
      date_signalement,
      description_panne,
      statut_depannage,
    });

    const savedDepannage = await this.depannageRepository.save(depannage);
    
    // Mettre à jour l'état du matériel
    await this.updateEtatMateriel(id_materiel, statut_depannage);
    
    return savedDepannage;
  }

  async findAll() {
    return await this.depannageRepository.find({
      relations: ['materiel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async findOne(id: string) {
    const depannage = await this.depannageRepository.findOne({
      where: { id },
      relations: ['materiel', 'demandeur'],
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

    // Si le statut a changé, mettre à jour l'état du matériel
    if (updateData.statut_depannage && updateData.statut_depannage !== depannage.statut_depannage) {
      console.log('🔄 STATUT A CHANGÉ - Synchronisation état matériel');
      const materielId = updateData.id_materiel || depannage.id_materiel;
      console.log('🎯 Matériel à mettre à jour:', materielId);
      await this.updateEtatMateriel(materielId, updateData.statut_depannage);
    } else {
      console.log('ℹ️ Pas de changement de statut détecté');
    }

    console.log('✅ FIN UPDATE');
    return updatedDepannage;
  }

  async remove(id: string) {
    const depannage = await this.findOne(id);
    const result = await this.depannageRepository.delete(id);
    
    // Remettre le matériel en "disponible" si le dépannage est supprimé
    await this.updateEtatMateriel(depannage.id_materiel, 'Résolu');
    
    return result;
  }

  async findByStatut(statut: string) {
    return await this.depannageRepository.find({
      where: { statut_depannage: statut },
      relations: ['materiel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async findByDemandeur(id_demandeur: string) {
    return await this.depannageRepository.find({
      where: { id_demandeur },
      relations: ['materiel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async findByMateriel(id_materiel: string) {
    return await this.depannageRepository.find({
      where: { id_materiel },
      relations: ['materiel', 'demandeur'],
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
    };
  }
}