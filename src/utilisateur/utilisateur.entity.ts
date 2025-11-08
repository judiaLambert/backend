import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeInsert } from 'typeorm';

@Entity('utilisateur')
export class Utilisateur {
  @PrimaryGeneratedColumn()
  id_utilisateur: number;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 255 })
  mot_de_passe: string;

  @Column({ default: 'demandeur' })
  role: string;

  @Column({ default: 'actif' })
  statut: string;

  @Column({ nullable: true })
  id_departement: string;

  @Column({ default: false })
  premier_login: boolean;

  @CreateDateColumn()
  date_creation: Date;

 
}