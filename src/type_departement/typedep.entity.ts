import { Entity, Column, PrimaryColumn, BeforeInsert } from 'typeorm';

@Entity('typedepartement')
export class TypeDepartement {
  @PrimaryColumn()
  id_typedepartement: string;

  @Column()
  nom: string;
}
