import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeDepartement } from './typedep.entity';

@Injectable()
export class TypeDepartementService {
  constructor(
    @InjectRepository(TypeDepartement)
    private repo: Repository<TypeDepartement>,
  ) {}

  private async generateNextId(): Promise<string> {
    try {
      const lastType = await this.repo
        .createQueryBuilder('td')
        .orderBy('td.id_typedepartement', 'DESC')
        .getOne();

      if (!lastType) {
        return 'TDEP01';
      }

      const lastNumber = parseInt(lastType.id_typedepartement.replace('TDEP', ''));
      const nextNumber = lastNumber + 1;
      
      return `TDEP${nextNumber.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error generating next ID:', error);
      throw error;
    }
  }

  async create(nom: string) {
    try {
      const newId = await this.generateNextId();
      const td = this.repo.create({ id_typedepartement: newId, nom });
      return await this.repo.save(td);
    } catch (error) {
      console.error('Error creating type departement:', error);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.repo.find({
        order: { id_typedepartement: 'ASC' }
      });
    } catch (error) {
      console.error('Error finding all type departements:', error);
      throw error;
    }
  }

  findOne(id: string) {
    return this.repo.findOne({ 
      where: { id_typedepartement: id } 
    });
  }

  update(id: string, nom: string) {
    return this.repo.update({ id_typedepartement: id }, { nom });
  }

  remove(id: string) {
    return this.repo.delete({ id_typedepartement: id });
  }
}
