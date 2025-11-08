// src/type-departement/type-departement.entity.ts
import { Entity, Column, PrimaryColumn, BeforeInsert } from 'typeorm';

@Entity('typedepartement')
export class TypeDepartement {
  @PrimaryColumn()
  id: string;

  @Column()
  nom: string;

  
}
