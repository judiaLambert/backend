import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('typemateriel')
export class TypeMateriel {
  @PrimaryColumn({ name: 'id_typemateriel' })
  id: string;

  @Column('text')
  designation: string;

  @Column('text', { nullable: true })
  description: string;
}