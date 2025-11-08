import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtatMateriel } from './etatmateriel.entity';
import { EtatMaterielService } from './etatmateriel.service';
import { EtatMaterielController } from './etatmateriel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EtatMateriel])],
  providers: [EtatMaterielService],
  controllers: [EtatMaterielController],
})
export class EtatMaterielModule {}