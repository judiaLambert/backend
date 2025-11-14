import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TypeDepartement } from '../type_departement/typedep.entity';

@Entity('departement')
export class Departement {
  @PrimaryColumn()
  id_departement: string;

  @Column()
  num_salle: string;

  @ManyToOne(() => TypeDepartement, { eager: true })
  @JoinColumn({ name: 'id_typedepartement' })
  typeDepartement: TypeDepartement;

  @Column()
  nom_service: string;
}