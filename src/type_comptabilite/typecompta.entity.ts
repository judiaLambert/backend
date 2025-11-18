import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('type_comptabilite')
export class TypeComptabilite {
  @PrimaryColumn()
  id_typecomptabilite: string;

  @Column()
  libelle_typecomptabilite: string;

  @Column('decimal', { precision: 15, scale: 2 })
  seuil_comptabilite: number;

}
