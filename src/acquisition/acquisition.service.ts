import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Acquisition } from './acquisition.entity';
import { FournisseurTypeMaterielService } from '../fournisseur_typemateriel/fournisseurtype.service';
import { MaterielService } from '../materiel/materiel.service';

@Injectable()
export class AcquisitionService {
  constructor(
    @InjectRepository(Acquisition)
    private acquisitionRepository: Repository<Acquisition>,
    @Inject(forwardRef(() => FournisseurTypeMaterielService))
    private fournisseurTypeService: FournisseurTypeMaterielService,
    @Inject(forwardRef(() => MaterielService))
    private materielService: MaterielService,
  ) {}

  async create(idFournisseur: string, dateAcquisition: Date, typeAcquisition: string, id_typemateriel?: string) {
    const acquisition = this.acquisitionRepository.create({
      fournisseur: { id: idFournisseur } as any,
      dateAcquisition,
      typeAcquisition,
    });
    
    const saved = await this.acquisitionRepository.save(acquisition);

    // ✅ Créer automatiquement l'association Fournisseur ↔ TypeMateriel
    if (id_typemateriel) {
      await this.fournisseurTypeService.createAssociation(
        idFournisseur, 
        id_typemateriel,
        `Première acquisition le ${dateAcquisition.toLocaleDateString()}`
      );
    }

    return saved;
  }

  async findAll() {
    return await this.acquisitionRepository.find({
      relations: ['fournisseur'],
      order: { dateAcquisition: 'DESC' }
    });
  }

  async findOne(id: string) {
    return await this.acquisitionRepository.findOne({
      where: { id },
      relations: ['fournisseur'],
    });
  }

  async update(id: string, idFournisseur: string, dateAcquisition: Date, typeAcquisition: string) {
    await this.acquisitionRepository.update(id, {
      fournisseur: { id: idFournisseur } as any,
      dateAcquisition,
      typeAcquisition,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.acquisitionRepository.delete(id);
  }

  async findByFournisseur(fournisseurId: string) {
    return await this.acquisitionRepository.find({
      where: { fournisseur: { id: fournisseurId } },
      relations: ['fournisseur'],
      order: { dateAcquisition: 'DESC' }
    });
  }
}