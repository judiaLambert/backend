import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Materiel, CategorieMateriel } from './materiel.entity';
import { EtatMateriel } from '../etatmateriel/etatmateriel.entity';

@Injectable()
export class MaterielService {
  constructor(
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    @InjectRepository(EtatMateriel)
    private etatMaterielRepository: Repository<EtatMateriel>,
  ) {}

  async create(
    idEtatMateriel: string, 
    idTypeMateriel: string, 
    idTypeComptabilite: string,
    designation: string,
    categorie: CategorieMateriel
  ) {
    const materiel = this.materielRepository.create({
      etatMateriel: { id: idEtatMateriel } as any,
      typeMateriel: { id: idTypeMateriel } as any,
      typeComptabilite: { id_typecomptabilite: idTypeComptabilite } as any,
      designation,
      categorie_materiel: categorie
    });
    return await this.materielRepository.save(materiel);
  }

  async findAll() {
    return await this.materielRepository.find({
      relations: ['etatMateriel', 'typeMateriel', 'typeComptabilite'],
      order: { id: 'ASC' }
    });
  }

  async findOne(id: string) {
    return await this.materielRepository.findOne({
      where: { id },
      relations: ['etatMateriel', 'typeMateriel', 'typeComptabilite'],
    });
  }

  async update(
    id: string, 
    idEtatMateriel: string, 
    idTypeMateriel: string, 
    idTypeComptabilite: string,
    designation: string,
    categorie: CategorieMateriel
  ) {
    await this.materielRepository.update(id, {
      etatMateriel: { id: idEtatMateriel } as any,
      typeMateriel: { id: idTypeMateriel } as any,
      typeComptabilite: { id_typecomptabilite: idTypeComptabilite } as any,
      designation,
      categorie_materiel: categorie
    });
    return this.findOne(id);
  }

  async updateEtat(id: string, idEtatMateriel: string) {
    await this.materielRepository.update(id, {
      etatMateriel: { id: idEtatMateriel } as any,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.materielRepository.delete(id);
  }

  async findByEtat(etatId: string) {
    return await this.materielRepository.find({
      where: { etatMateriel: { id: etatId } },
      relations: ['etatMateriel', 'typeMateriel', 'typeComptabilite'],
    });
  }

  async findByType(typeId: string) {
    return await this.materielRepository.find({
      where: { typeMateriel: { id: typeId } },
      relations: ['etatMateriel', 'typeMateriel', 'typeComptabilite'],
    });
  }

  async findByCategorie(categorie: CategorieMateriel) {
    return await this.materielRepository.find({
      where: { categorie_materiel: categorie },
      relations: ['etatMateriel', 'typeMateriel', 'typeComptabilite'],
    });
  }

  async getEtatsMateriel() {
    return await this.etatMaterielRepository.find();
  }

  async findEtatByDesignation(designation: string) {
    return await this.etatMaterielRepository.findOne({
      where: { designation }
    });
  }
}
