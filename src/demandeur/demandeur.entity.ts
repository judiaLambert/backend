import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Departement } from '../departement/departement.entity';
import { Utilisateur } from '../utilisateur/utilisateur.entity';

@Entity('demandeur')
export class Demandeur {
  @PrimaryGeneratedColumn()
  id_demandeur: string;

  @Column()
  nom: string;

  @Column()
  telephone: string;

  @Column()
  email: string;

  @Column()
  type_demandeur: string; // 'enseignant' ou 'service'

  @ManyToOne(() => Departement)
  @JoinColumn({ name: 'id_departement' })
  departement: Departement;

  @ManyToOne(() => Utilisateur)
  @JoinColumn({ name: 'id_utilisateur' })
  utilisateur: Utilisateur;
}