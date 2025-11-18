import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeComptabilite } from './typecompta.entity';

@Injectable()
export class TypeComptabiliteService {
  constructor(
    @InjectRepository(TypeComptabilite)
    private repo: Repository<TypeComptabilite>,
  ) {}

  // Générer le prochain ID au format COMP01, COMP02, etc.
  private async generateNextId(): Promise<string> {
    try {
      const lastType = await this.repo
        .createQueryBuilder('tc')
        .orderBy('tc.id_typecomptabilite', 'DESC')
        .getOne();

      if (!lastType) {
        return 'COMP01';
      }

      const lastNumber = parseInt(lastType.id_typecomptabilite.replace('COMP', ''));
      const nextNumber = lastNumber + 1;
      
      return `COMP${nextNumber.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error generating next ID:', error);
      throw error;
    }
  }

  async create(libelle: string, seuil: number) {
    try {
      const newId = await this.generateNextId();
      const typeComp = this.repo.create({
        id_typecomptabilite: newId,
        libelle_typecomptabilite: libelle,
        seuil_comptabilite: seuil,
      });
      return await this.repo.save(typeComp);
    } catch (error) {
      console.error('Error creating type comptabilite:', error);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.repo.find({
        order: { id_typecomptabilite: 'ASC' }
      });
    } catch (error) {
      console.error('Error finding all type comptabilites:', error);
      throw error;
    }
  }

  findOne(id: string) {
    return this.repo.findOne({ 
      where: { id_typecomptabilite: id } 
    });
  }

  async update(id: string, libelle: string, seuil: number) {
    await this.repo.update(
      { id_typecomptabilite: id },
      { 
        libelle_typecomptabilite: libelle,
        seuil_comptabilite: seuil,
        
      }
    );
    return this.findOne(id);
  }

  remove(id: string) {
    return this.repo.delete({ id_typecomptabilite: id });
  }
}
