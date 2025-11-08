import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepannageController } from './depannage.controller';
import { DepannageService } from './depannage.service';
import { Depannage } from './depannage.entity';
import { MaterielModule } from '../materiel/materiel.module';

@Module({
  imports: [TypeOrmModule.forFeature([Depannage]),MaterielModule],
  controllers: [DepannageController],
  providers: [DepannageService],
  exports: [DepannageService],
})
export class DepannageModule {}