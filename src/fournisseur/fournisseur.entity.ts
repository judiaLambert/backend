import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeMateriel } from '../typemateriel/typemateriel.entity';

@Entity('fournisseur')
export class Fournisseur {
  @PrimaryColumn({ name: 'id_fournisseur' })
  id: string;

  @Column({ name: 'nom_fournisseur' })
  nom: string;

  @Column({ name: 'contact_fournisseur' })
  contact: string;

  @Column({ name: 'adresse_fournisseur', type: 'text' })
  adresse: string;

  @Column({ name: 'nif', nullable: true })
  nif: string;

  @Column({ name: 'stat', nullable: true })
  stat: string;

  @Column({ name: 'email', nullable: true })
  email: string;

  @ManyToOne(() => TypeMateriel)
  @JoinColumn({ name: 'id_typemateriel' })
  typeMateriel: TypeMateriel;

  @Column({ name: 'date_livraison', type: 'date' })
  dateLivraison: Date;
}
