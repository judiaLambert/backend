import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Fournisseur } from '../fournisseur/fournisseur.entity';
import { TypeMateriel } from '../typemateriel/typemateriel.entity';

@Entity('fournisseur_type_materiel')
export class FournisseurTypeMateriel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fournisseur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_fournisseur' })
  fournisseur: Fournisseur;

  @Column({ name: 'id_fournisseur' })
  id_fournisseur: string;

  @ManyToOne(() => TypeMateriel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_typemateriel' })
  typeMateriel: TypeMateriel;

  @Column({ name: 'id_typemateriel' })
  id_typemateriel: string;

  @CreateDateColumn({ name: 'date_association' })
  dateAssociation: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}