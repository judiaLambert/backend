import { Injectable, NotFoundException } from '@nestjs/common';
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
        console.log(' Statut non reconnu:', statut_depannage);
        return;
    }
    
    console.log(' Nouvel état recherché:', nouvelEtatDesignation);
    
    try {
        const tousLesEtats = await this.materielService.getEtatsMateriel();
    console.log(' TOUS LES ÉTATS DISPONIBLES:', tousLesEtats.map(e => e.designation));
    
      // Trouver l'ID de l'état correspondant
      const etatCorrespondant = await this.materielService.findEtatByDesignation(nouvelEtatDesignation);
      
      console.log(' État correspondant trouvé:', etatCorrespondant);
      
      if (etatCorrespondant) {
        console.log(' Mise à jour matériel vers:', etatCorrespondant.designation);
        await this.materielService.updateEtat(id_materiel, etatCorrespondant.id);
        console.log(' Matériel mis à jour avec succès');
      } else {
        console.log(' État non trouvé pour:', nouvelEtatDesignation);
      }
    } catch (error) {
      console.error(' Erreur lors de la mise à jour:', error);
    }
    
   
  }

  async create(
    id_materiel: string,
    id_demandeur: string,
    date_signalement: Date,
    description_panne: string,
    statut_depannage: string,
  ) {
    const id = await this.generateId();
    
    const depannage = this.depannageRepository.create({
      id,
      materiel: { id: id_materiel } as any,
      demandeur: { id: id_demandeur } as any,
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
      updateFields.materiel = { id: updateData.id_materiel } as any;
    }
    
    if (updateData.id_demandeur !== undefined) {
      updateFields.demandeur = { id: updateData.id_demandeur } as any;
    }

    await this.depannageRepository.update(id, updateFields);
    const updatedDepannage = await this.findOne(id);

    // Si le statut a changé, mettre à jour l'état du matériel
    if (updateData.statut_depannage && updateData.statut_depannage !== depannage.statut_depannage) {
      console.log('🔄 STATUT A CHANGÉ - Synchronisation état matériel');
      const materielId = updateData.id_materiel || depannage.materiel.id;
      console.log('🎯 Matériel à mettre à jour:', materielId);
      await this.updateEtatMateriel(materielId, updateData.statut_depannage);
    } else {
      console.log('❌ Pas de changement de statut détecté');
    }

    console.log('✅ FIN UPDATE');
    return updatedDepannage;
  }

  async remove(id: string) {
    const depannage = await this.findOne(id);
    const result = await this.depannageRepository.delete(id);
    
    // Remettre le matériel en "disponible" si le dépannage est supprimé
    await this.updateEtatMateriel(depannage.materiel.id, 'Résolu');
    
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
      where: { demandeur: { id_demandeur: id_demandeur } },
      relations: ['materiel', 'demandeur'],
      order: { date_signalement: 'DESC' },
    });
  }

  async findByMateriel(id_materiel: string) {
    return await this.depannageRepository.find({
      where: { materiel: { id: id_materiel } },
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