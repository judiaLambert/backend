// src/type-departement/type-departement.service.ts
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

  create(nom: string) {
    const td = this.repo.create({ nom });
    return this.repo.save(td);
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  update(id: string, nom: string) {
    return this.repo.update(id, { nom });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
