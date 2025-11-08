import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeDepartement } from '../type_departement/typedep.entity';

@Entity('departement')
export class Departement {
  @PrimaryGeneratedColumn()
  id_departement: string; // Changé de 'id' à 'id_departement'

  @ManyToOne(() => TypeDepartement)
  @JoinColumn({ name: 'id_typedepartement' })
  typeDepartement: TypeDepartement;

  @Column()
  num_salle: string; // Nouveau champ normal

  @Column()
  nom_service: string;
}