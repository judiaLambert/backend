import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('password_reset_token')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  token: string;

  @Column()
  expiration: Date;

  @Column({ default: false })
  utilise: boolean;

  @CreateDateColumn()
  date_creation: Date;
}